import { SnippetBase, type GenerateContextType, type OasSchema, type OasRef } from '@skmtc/core'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'
import { MediaTypes } from '../toContent.ts'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

type SectionArgs = {
  context: GenerateContextType
  title: string
  schema: OasSchema | OasRef<'schema'> | undefined
  description: string | undefined
  definitions?: Definitions
  /** The media types to annotate — `toContent(…).listedMediaTypes`. */
  mediaTypes?: string[]
  required?: boolean
}

/**
 * Renders a titled documentation section — a request body, payload or response
 * — the Markdown counterpart of the docs viewer's `Section`.
 *
 * A level-two heading, an optional description, a content-type annotation, the
 * schema rendered as a {@link Schema}, and a collated example as an
 * {@link Example}, each separated by a blank line.
 *
 * Always renders: a section is worth showing when it has a schema or a
 * description, and the parent decides that with
 * `new Maybe(new Loop([schema, description?.trim()]), () => new Section(…))`.
 */
export class Section extends SnippetBase {
  parts: Loop

  constructor({
    context,
    title,
    schema,
    description,
    definitions,
    mediaTypes,
    required
  }: SectionArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.parts = new Loop(
      [
        new Wrap(['## ', title]),
        new Maybe(required, () => '**Required.**'),
        new Maybe(description?.trim(), text => new Description({ context, description: text })),
        new Maybe(mediaTypes, types => new MediaTypes({ context, mediaTypes: types })),
        new Maybe(
          schema,
          present =>
            new Schema({
              context,
              name: undefined,
              schema: present,
              required: undefined,
              definitions
            })
        ),
        new Maybe(toExample(schema), example => new Example({ context, example }))
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}
