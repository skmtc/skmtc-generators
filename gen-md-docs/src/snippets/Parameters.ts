import { SnippetBase, type GenerateContextType, type OasParameter } from '@skmtc/core'
import { Name } from './Name.ts'
import { Schema, type Definitions } from './Schema.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'
import { toContent, MediaTypes } from '../toContent.ts'
import { safeResolve } from '../safeResolve.ts'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

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
 * Always renders: the operation builds a group only when it has parameters,
 * with `new Maybe(operation.toParams([location]), parameters => new Parameters(…))`.
 */
export class Parameters extends SnippetBase {
  title: string
  rows: Loop

  constructor({ context, title, parameters, definitions }: ParametersArgs) {
    super({ context })

    this.title = title
    this.rows = new Loop(
      parameters.map(parameter => new Parameter({ context, parameter, definitions })),
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `## ${this.title}\n\n${this.rows}`
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
 *
 * The note's style/explode only matter for array and object schema parameters,
 * and only when they differ from the location's defaults; the parser fills
 * defaults in (including `explode: false` for scalars), so this suppresses that
 * noise.
 */
class Parameter extends SnippetBase {
  parts: Loop

  constructor({ context, parameter, definitions }: ParameterArgs) {
    super({ context, stackTrail: parameter.stackTrail.clone() })

    const content =
      parameter.schema === undefined && parameter.content !== undefined
        ? toContent(parameter.content)
        : undefined
    const schema = parameter.schema ?? content?.schema

    const type = schema !== undefined ? safeResolve(schema)?.type : undefined
    const serializes = content === undefined && (type === 'array' || type === 'object')
    const defaultStyle =
      parameter.location === 'query' || parameter.location === 'cookie' ? 'form' : 'simple'
    const defaultExplode = (parameter.style ?? defaultStyle) === 'form'

    const note = new Loop(
      [
        new Maybe(parameter.deprecated, () => 'deprecated'),
        new Maybe(
          serializes && parameter.style !== defaultStyle ? parameter.style : undefined,
          style => new Wrap(['style: ', style])
        ),
        // `explode: false` is a value to report, so presence is a boolean subject.
        new Maybe(
          serializes && parameter.explode !== undefined && parameter.explode !== defaultExplode,
          () => (parameter.explode ? 'exploded' : 'not exploded')
        ),
        new Maybe(parameter.allowReserved, () => 'allows reserved characters')
      ],
      { separator: ', ' }
    )

    this.parts = new Loop(
      [
        schema
          ? new Schema({
              context,
              name: parameter.name,
              schema,
              required: parameter.required,
              description: parameter.description,
              definitions
            })
          : new Loop(
              [
                new Maybe(parameter.name, name => new Name({ context, name })),
                new Maybe(parameter.description?.trim(), text => new Wrap(['— ', text]))
              ],
              { separator: ' ' }
            ),
        new Maybe(
          content?.listedMediaTypes,
          types => new MediaTypes({ context, mediaTypes: types })
        ),
        new Maybe(note, loop => new Wrap(['_', loop, '_'])),
        new Maybe(toExample(schema), example => new Example({ context, example }))
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}
