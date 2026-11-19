import {
  SnippetBase,
  type GenerateContextType,
  type OasRequestBody,
  type OasSchema,
  type OasRef
} from '@skmtc/core'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'
import { toContent, toMediaTypeLine } from '../toContent.ts'
import { safeResolve, UNRESOLVED_REF } from '../safeResolve.ts'

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
  title: string
  required: boolean
  description: Description
  mediaTypeLine: string | undefined
  schema: Schema | undefined
  example: Example

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

    this.title = title
    this.required = required === true
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

    return [
      `## ${this.title}`,
      this.required ? '**Required.**' : '',
      description,
      this.mediaTypeLine ?? '',
      schema,
      this.example.toString()
    ]
      .filter(part => part !== '')
      .join('\n\n')
  }
}

type UnresolvedSectionArgs = {
  context: GenerateContextType
  title: string
  /** The section's `$ref`, which names nothing. */
  ref: string
}

/**
 * A section whose own `$ref` names nothing, such as a request body: its
 * heading stays, over the `$ref` marked with {@link UNRESOLVED_REF}, so a
 * reader can tell it from an operation that documents no such section.
 */
export class UnresolvedSection extends SnippetBase {
  title: string
  ref: string

  constructor({ context, title, ref }: UnresolvedSectionArgs) {
    super({ context })

    this.title = title
    this.ref = ref
  }

  override toString(): string {
    return `## ${this.title}\n\n- \`${this.ref}\`${UNRESOLVED_REF}`
  }
}

type RequestBodySectionArgs = {
  context: GenerateContextType
  requestBody: OasRequestBody | OasRef<'requestBody'> | undefined
  definitions?: Definitions
}

/**
 * The request body section, chosen once: an {@link UnresolvedSection} for a
 * body whose `$ref` names nothing, otherwise the body's {@link Section}, which
 * renders the empty string for an operation that takes no body.
 */
export class RequestBodySection extends SnippetBase {
  section: Section | UnresolvedSection

  constructor({ context, requestBody, definitions }: RequestBodySectionArgs) {
    super({ context })

    const resolved = requestBody !== undefined ? safeResolve(requestBody) : undefined
    const content = toContent(resolved?.content)

    this.section =
      requestBody?.isRef() && resolved === undefined
        ? new UnresolvedSection({ context, title: 'Request body', ref: requestBody.$ref })
        : new Section({
            context,
            title: 'Request body',
            schema: content.schema,
            description: resolved?.description,
            definitions,
            mediaTypes: content.mediaTypes,
            required: resolved?.required
          })
  }

  override toString(): string {
    return `${this.section}`
  }
}
