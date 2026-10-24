import { SnippetBase, type GenerateContextType, type OasParameter } from '@skmtc/core'
import { Name } from '@/src/snippets/Name.ts'
import { Schema, type Definitions } from '@/src/snippets/Schema.ts'
import { Example } from '@/src/snippets/Example.ts'
import { toExample } from '@/src/toExample.ts'
import { toContent, MediaTypes } from '@/src/toContent.ts'
import { safeResolve } from '@/src/safeResolve.ts'
import { Loop, Maybe, Wrap } from '@/src/Maybe.ts'

type ParametersArgs = {
  context: GenerateContextType
  title: string
  parameters: readonly OasParameter[]
  definitions?: Definitions
}

/**
 * Renders a titled group of parameters — `## Path parameters` and the like —
 * the Markdown counterpart of the docs viewer's `Parameters`.
 *
 * Always renders: the operation builds a group only when it has parameters,
 * with `Maybe.nonEmpty(operation.toParams([location]), parameters => new Parameters(…))`.
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
        Maybe.when(parameter.deprecated === true, () => 'deprecated'),
        Maybe.fromPredicate(
          parameter.style,
          style => serializes && style !== defaultStyle,
          style => new Wrap(['style: ', style])
        ),
        Maybe.fromPredicate(
          parameter.explode,
          explode => serializes && explode !== defaultExplode,
          explode =>
            Maybe.when(
              explode,
              () => 'exploded',
              () => 'not exploded'
            )
        ),
        Maybe.when(parameter.allowReserved === true, () => 'allows reserved characters')
      ],
      { separator: ', ' }
    )

    this.parts = new Loop(
      [
        new Maybe(
          schema,
          present =>
            new Schema({
              context,
              name: parameter.name,
              schema: present,
              required: parameter.required,
              description: parameter.description,
              definitions
            }),
          () =>
            new Loop(
              [
                Maybe.nonEmptyText(parameter.name, name => new Name({ context, name })),
                Maybe.nonEmptyText(parameter.description?.trim(), text => new Wrap(['— ', text]))
              ],
              { separator: ' ' }
            )
        ),
        Maybe.nonEmpty(
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
