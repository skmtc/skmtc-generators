import { SnippetBase, type GenerateContextType, type OasSchema, type OasRef } from '@skmtc/core'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'
import { toMediaTypeLine } from '../toContent.ts'

type SectionArgs = {
  context: GenerateContextType
  title: string
  schema: OasSchema | OasRef<'schema'> | undefined
  description: string | undefined
  definitions?: Definitions
  mediaTypes?: string[]
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
  title: string
  description: Description
  mediaTypeLine: string | undefined
  schema: Schema | undefined
  example: Example

  constructor({ context, title, schema, description, definitions, mediaTypes }: SectionArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.title = title
    this.description = new Description({ context, description })
    this.mediaTypeLine = mediaTypes !== undefined ? toMediaTypeLine(mediaTypes) : undefined
    this.schema = schema
      ? new Schema({ context, name: undefined, schema, required: undefined, definitions })
      : undefined
    this.example = new Example({ context, example: toExample(schema) })
  }

  override toString(): string {
    const description = this.description.toString()
    const schema = this.schema?.toString() ?? ''

    if (schema === '' && description === '') {
      return ''
    }

    return [`## ${this.title}`, description, this.mediaTypeLine ?? '', schema, this.example.toString()]
      .filter(part => part !== '')
      .join('\n\n')
  }
}
