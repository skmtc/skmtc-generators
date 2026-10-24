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
  mediaTypes?: string[]
  required?: boolean
}

/**
 * Renders a titled documentation section — a request body, payload or response
 * — the Markdown counterpart of the docs viewer's `Section`.
 *
 * A level-two heading, an optional description, a content-type annotation (only
 * when it is not the plain single `application/json`), the schema rendered as a
 * {@link Schema}, and a collated example as an {@link Example}, each separated
 * by a blank line. Renders the empty string when there is neither a schema nor
 * a description, so an operation can interpolate every section unconditionally.
 */
export class Section extends SnippetBase {
  content: Maybe<Loop, Loop>

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

    const text = new Description({ context, description }).content
    const body = new Maybe(
      schema,
      present =>
        new Schema({ context, name: undefined, schema: present, required: undefined, definitions })
    )

    this.content = new Maybe(
      new Loop([body, text]),
      () =>
        new Loop(
          [
            new Wrap(['## ', title]),
            new Maybe(required, () => '**Required.**'),
            text,
            new Maybe(mediaTypes, types => new MediaTypes({ context, mediaTypes: types }).content),
            body,
            new Example({ context, example: toExample(schema) }).content
          ],
          { separator: '\n\n' }
        )
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}
