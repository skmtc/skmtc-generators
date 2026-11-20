import {
  SnippetBase,
  type GenerateContextType,
  type OasOperation,
  type OasParameter,
  type OasParameterLocation
} from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Name } from './Name.ts'
import { Schema } from './Schema.ts'
import { DescriptionClause } from './Description.ts'
import { toExampleBlock, type InlineExample, type JsonExample } from './Example.ts'
import { Heading } from './Heading.ts'
import { InlineCode } from './InlineCode.ts'
import { MediaTypes } from './MediaTypes.ts'
import { UnresolvedMarker } from './Unresolved.ts'
import { toExample } from '../toExample.ts'
import { toContent } from '../toContent.ts'
import { safeResolve } from '../safeResolve.ts'

type OperationParametersArgs = {
  context: GenerateContextType
  operation: OasOperation
  /** The document the parameters are written in. */
  destinationPath: string
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
  /** A group for each location that has parameters, then the ones whose `$ref` names nothing. */
  sections: List<(Parameters | UnresolvedParameters)[], '\n\n', 'none'>

  constructor({ context, operation, destinationPath }: OperationParametersArgs) {
    super({ context })

    const parameters = operation.toEffectiveParameters()
    const resolved = parameters.flatMap(parameter => safeResolve(parameter) ?? [])
    const unresolvedRefs = parameters.flatMap(parameter =>
      parameter.isRef() && safeResolve(parameter) === undefined ? [parameter.$ref] : []
    )

    this.sections = new List<(Parameters | UnresolvedParameters)[], '\n\n', 'none'>(
      [
        ...PARAMETER_GROUPS.map(({ title, location }) => {
          const located = resolved.filter(parameter => parameter.location === location)

          return located.length > 0 ? new Parameters({ context, title, parameters: located, destinationPath }) : undefined
        }),
        unresolvedRefs.length > 0 ? new UnresolvedParameters({ context, refs: unresolvedRefs }) : undefined
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.sections}`
  }
}

type ParametersArgs = {
  context: GenerateContextType
  title: string
  /** The group's parameters: at least one. */
  parameters: OasParameter[]
  /** The document the parameters are written in. */
  destinationPath: string
}

/**
 * Renders a titled group of parameters — `## Path parameters` and the like —
 * the Markdown counterpart of the docs viewer's `Parameters`.
 */
export class Parameters extends SnippetBase {
  blocks: List<(Heading | Parameter)[], '\n\n', 'none'>

  constructor({ context, title, parameters, destinationPath }: ParametersArgs) {
    super({ context })

    this.blocks = new List<(Heading | Parameter)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 2, text: title }),
        ...parameters.map(parameter => new Parameter({ context, parameter, destinationPath }))
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type UnresolvedParametersArgs = {
  context: GenerateContextType
  /** The `$ref` of each parameter that names nothing: at least one. */
  refs: string[]
}

/**
 * The parameters whose `$ref` names nothing, each by its `$ref` and the
 * unresolved marker, as `## Parameters` after the located groups: such a
 * parameter has no location to group it under.
 */
class UnresolvedParameters extends SnippetBase {
  heading: Heading
  lines: List<UnresolvedParameter[], '\n', 'none'>

  constructor({ context, refs }: UnresolvedParametersArgs) {
    super({ context })

    this.heading = new Heading({ context, level: 2, text: 'Parameters' })
    this.lines = new List(
      refs.map(ref => new UnresolvedParameter({ context, ref })),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.heading}\n\n${this.lines}`
  }
}

type UnresolvedParameterArgs = {
  context: GenerateContextType
  ref: string
}

/** One parameter whose `$ref` names nothing: ``- `#/components/parameters/X` (unresolved $ref)``. */
class UnresolvedParameter extends SnippetBase {
  ref: InlineCode
  marker: UnresolvedMarker

  constructor({ context, ref }: UnresolvedParameterArgs) {
    super({ context })

    this.ref = new InlineCode({ context, value: ref })
    this.marker = new UnresolvedMarker({ context })
  }

  override toString(): string {
    return `- ${this.ref} ${this.marker}`
  }
}

type ParameterArgs = {
  context: GenerateContextType
  parameter: OasParameter
  /** The document the parameters are written in. */
  destinationPath: string
}

/** One block of a {@link Parameter}. */
type ParameterBlock =
  | Schema
  | List<(Name | DescriptionClause)[], ' ', 'none'>
  | MediaTypes
  | ParameterNote
  | JsonExample
  | InlineExample

/**
 * Renders one parameter: its schema (or its `content`-typed media type and
 * schema), a serialization note when one applies, and a collated example.
 *
 * The parameter's schema renders through {@link Schema} — so an object parameter
 * expands its fields — with the parameter's own `description` as the external
 * override. A `content`-typed parameter uses its media type's schema; one with
 * neither falls back to its bold name and description.
 */
class Parameter extends SnippetBase {
  blocks: List<ParameterBlock[], '\n\n', 'none'>

  constructor({ context, parameter, destinationPath }: ParameterArgs) {
    super({ context, stackTrail: parameter.stackTrail.clone() })

    const content =
      parameter.schema === undefined && parameter.content !== undefined
        ? toContent(parameter.content)
        : undefined
    const schema = parameter.schema ?? content?.schema
    const description = parameter.description?.trim()
    const type = schema !== undefined ? safeResolve(schema)?.type : undefined
    const note = new ParameterNote({
      context,
      parameter,
      serializes: content === undefined && (type === 'array' || type === 'object')
    })

    this.blocks = new List<ParameterBlock[], '\n\n', 'none'>(
      [
        schema !== undefined
          ? new Schema({
              context,
              name: parameter.name,
              schema,
              required: parameter.required,
              description: parameter.description,
              destinationPath
            })
          : new List<(Name | DescriptionClause)[], ' ', 'none'>(
              [
                new Name({ context, name: parameter.name }),
                description ? new DescriptionClause({ context, description }) : undefined
              ],
              { separator: ' ' }
            ),
        content !== undefined && content.listedMediaTypes.length > 0
          ? new MediaTypes({ context, mediaTypes: content.listedMediaTypes })
          : undefined,
        note.parts.values.length > 0 ? note : undefined,
        toExampleBlock({ context, example: toExample(schema) })
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type ParameterNoteArgs = {
  context: GenerateContextType
  parameter: OasParameter
  /** The parameter serializes an array or object: style and explode apply to it. */
  serializes: boolean
}

/**
 * A parameter's serialization note, in italics: deprecated and allowReserved,
 * plus style and explode. Style and explode matter only for an array or object
 * schema, and only when they differ from the location's defaults; the parser
 * fills the defaults in (including `explode: false` for scalars), so the note
 * leaves those out. Its owner writes it only when it has a part.
 */
class ParameterNote extends SnippetBase {
  parts: List<(string | ParameterStyle | Explode)[], ', ', 'none'>

  constructor({ context, parameter, serializes }: ParameterNoteArgs) {
    super({ context })

    const defaultStyle =
      parameter.location === 'query' || parameter.location === 'cookie' ? 'form' : 'simple'
    const defaultExplode = (parameter.style ?? defaultStyle) === 'form'
    const style = serializes && parameter.style !== defaultStyle ? parameter.style : undefined
    const explode = serializes && parameter.explode !== defaultExplode ? parameter.explode : undefined

    this.parts = new List<(string | ParameterStyle | Explode)[], ', ', 'none'>(
      [
        parameter.deprecated === true ? 'deprecated' : undefined,
        style !== undefined ? new ParameterStyle({ context, style }) : undefined,
        explode !== undefined ? new Explode({ context, exploded: explode }) : undefined,
        parameter.allowReserved === true ? 'allows reserved characters' : undefined
      ],
      { separator: ', ' }
    )
  }

  override toString(): string {
    return `_${this.parts}_`
  }
}

type ParameterStyleArgs = {
  context: GenerateContextType
  style: string
}

/** A parameter's serialization style, when it is not the location's default: `style: deepObject`. */
class ParameterStyle extends SnippetBase {
  style: string

  constructor({ context, style }: ParameterStyleArgs) {
    super({ context })

    this.style = style
  }

  override toString(): string {
    return `style: ${this.style}`
  }
}

type ExplodeArgs = {
  context: GenerateContextType
  exploded: boolean
}

/** Whether a parameter explodes, when that is not its style's default: `exploded` or `not exploded`. */
class Explode extends SnippetBase {
  exploded: boolean

  constructor({ context, exploded }: ExplodeArgs) {
    super({ context })

    this.exploded = exploded
  }

  override toString(): string {
    return this.exploded ? 'exploded' : 'not exploded'
  }
}
