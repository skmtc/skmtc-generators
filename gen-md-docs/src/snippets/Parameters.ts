import {
  SnippetBase,
  type GenerateContextType,
  type OasOperation,
  type OasParameter,
  type OasParameterLocation,
  type OasSchema,
  type OasRef
} from '@skmtc/core'
import { Name } from './Name.ts'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'
import { toContent, toMediaTypeLine } from '../toContent.ts'
import { safeResolve, UNRESOLVED_REF } from '../safeResolve.ts'

type OperationParametersArgs = {
  context: GenerateContextType
  operation: OasOperation
  definitions?: Definitions
}

/** A group of parameters: its heading and the location it holds. */
type ParameterGroup = {
  title: string
  location: OasParameterLocation
}

/** The located groups, in the order the docs show them. */
const PARAMETER_GROUPS: ParameterGroup[] = [
  { title: 'Path parameters', location: 'path' },
  { title: 'Query parameters', location: 'query' },
  { title: 'Headers', location: 'header' },
  { title: 'Cookies', location: 'cookie' }
]

/**
 * Renders the parameters that apply to an operation — its path item's and its
 * own — the Markdown counterpart of the docs viewer's `OperationParams`: a
 * {@link Parameters} group for each location that has any, then the ones whose
 * `$ref` names nothing. Each parameter resolves by itself, so one that names
 * nothing costs the document that parameter alone.
 */
export class OperationParameters extends SnippetBase {
  /** A group for each location that has parameters. */
  groups: Parameters[]
  /** The parameters whose `$ref` names nothing; `undefined` when there are none. */
  unresolved: UnresolvedParameters | undefined

  constructor({ context, operation, definitions }: OperationParametersArgs) {
    super({ context })

    const parameters = operation.toEffectiveParameters()
    const resolved = parameters.flatMap(parameter => safeResolve(parameter) ?? [])
    const unresolvedRefs = parameters.flatMap(parameter =>
      parameter.isRef() && safeResolve(parameter) === undefined ? [parameter.$ref] : []
    )

    this.groups = PARAMETER_GROUPS.flatMap(({ title, location }) => {
      const located = resolved.filter(parameter => parameter.location === location)

      return located.length > 0 ? [new Parameters({ context, title, parameters: located, definitions })] : []
    })
    this.unresolved =
      unresolvedRefs.length > 0 ? new UnresolvedParameters({ context, refs: unresolvedRefs }) : undefined
  }

  override toString(): string {
    const parts = this.unresolved !== undefined ? [...this.groups, this.unresolved] : this.groups

    return parts.join('\n\n')
  }
}

type ParametersArgs = {
  context: GenerateContextType
  title: string
  parameters: OasParameter[]
  definitions?: Definitions
}

/**
 * Renders a titled group of parameters — `## Path parameters` and the like —
 * the Markdown counterpart of the docs viewer's `Parameters`.
 *
 * Renders the empty string when the group has no parameters, so an operation
 * can interpolate every group (path / query / header / cookie) unconditionally.
 */
export class Parameters extends SnippetBase {
  title: string
  parameters: Parameter[]

  constructor({ context, title, parameters, definitions }: ParametersArgs) {
    super({ context })

    this.title = title
    this.parameters = parameters.map(parameter => new Parameter({ context, parameter, definitions }))
  }

  override toString(): string {
    if (this.parameters.length === 0) {
      return ''
    }

    return [`## ${this.title}`, ...this.parameters.map(parameter => parameter.toString())].join(
      '\n\n'
    )
  }
}

type UnresolvedParametersArgs = {
  context: GenerateContextType
  /** The `$ref` of each parameter that names nothing. */
  refs: string[]
}

/**
 * The parameters whose `$ref` names nothing, each by its `$ref` marked with
 * {@link UNRESOLVED_REF}, as `## Parameters` after the located groups: such a
 * parameter has no location to group it under.
 */
class UnresolvedParameters extends SnippetBase {
  refs: string[]

  constructor({ context, refs }: UnresolvedParametersArgs) {
    super({ context })

    this.refs = refs
  }

  override toString(): string {
    const lines = this.refs.map(ref => `- \`${ref}\`${UNRESOLVED_REF}`).join('\n')

    return `## Parameters\n\n${lines}`
  }
}

type ParameterArgs = {
  context: GenerateContextType
  parameter: OasParameter
  definitions?: Definitions
}

/**
 * Renders one parameter: its schema (or its `content`-typed media type + schema),
 * a serialization note (deprecated / style / explode / allowReserved when set),
 * and a collated example.
 *
 * The parameter's schema renders through {@link Schema} — so an object parameter
 * expands its fields — with the parameter's own `description` as the external
 * override. A `content`-typed parameter uses its media type's schema; one with
 * neither falls back to its bold name and description.
 */
class Parameter extends SnippetBase {
  name: Name
  mediaTypeLine: string | undefined
  schema: Schema | undefined
  description: Description
  note: string | undefined
  example: Example

  constructor({ context, parameter, definitions }: ParameterArgs) {
    super({ context, stackTrail: parameter.stackTrail.clone() })

    const content =
      parameter.schema === undefined && parameter.content !== undefined
        ? toContent(parameter.content)
        : undefined
    const schema = parameter.schema ?? content?.schema

    this.name = new Name({ context, name: parameter.name })
    this.mediaTypeLine = content !== undefined ? toMediaTypeLine(content.mediaTypes) : undefined
    this.schema = schema
      ? new Schema({
          context,
          name: parameter.name,
          schema,
          required: parameter.required,
          description: parameter.description,
          definitions
        })
      : undefined
    this.description = new Description({ context, description: parameter.description })
    this.note = toParameterNote(parameter, schema, content !== undefined)
    this.example = new Example({ context, example: toExample(schema) })
  }

  override toString(): string {
    const description = this.description.toString()
    const header =
      this.schema?.toString() ??
      [`${this.name}`, description && `— ${description}`].filter(part => part !== '').join(' ')

    return [header, this.mediaTypeLine ?? '', this.note ?? '', this.example.toString()]
      .filter(part => part !== '')
      .join('\n\n')
  }
}

/**
 * A parameter's serialization note — deprecated / allowReserved, plus style and
 * explode. Style/explode only matter for array and object schema parameters and
 * only when they differ from the location's defaults; the parser fills defaults
 * in (including `explode: false` for scalars), so this suppresses that noise.
 */
const toParameterNote = (
  parameter: OasParameter,
  schema: OasSchema | OasRef<'schema'> | undefined,
  isContent: boolean
): string | undefined => {
  const type = schema !== undefined ? safeResolve(schema)?.type : undefined
  const serializes = !isContent && (type === 'array' || type === 'object')
  const defaultStyle =
    parameter.location === 'query' || parameter.location === 'cookie' ? 'form' : 'simple'
  const defaultExplode = (parameter.style ?? defaultStyle) === 'form'

  const parts = [
    parameter.deprecated === true ? 'deprecated' : undefined,
    serializes && parameter.style !== undefined && parameter.style !== defaultStyle
      ? `style: ${parameter.style}`
      : undefined,
    serializes && parameter.explode !== undefined && parameter.explode !== defaultExplode
      ? parameter.explode
        ? 'exploded'
        : 'not exploded'
      : undefined,
    parameter.allowReserved === true ? 'allows reserved characters' : undefined
  ].filter((part): part is string => part !== undefined)

  return parts.length > 0 ? `_${parts.join(', ')}_` : undefined
}
