import {
  SnippetBase,
  type GenerateContextType,
  type OasParameter,
  type OasSchema,
  type OasRef
} from '@skmtc/core'
import { Name } from './Name.ts'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'
import { toContent, toMediaTypeLine } from '../toContent.ts'
import { safeResolve } from '../safeResolve.ts'

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
