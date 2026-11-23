import {
  SnippetBase,
  type GenerateContextType,
  type OasRequestBody,
  type OasSchema,
  type OasRef
} from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Schema } from './Schema.ts'
import { DocumentSchema } from './DocumentSchema.ts'
import { Description } from './Description.ts'
import { toExampleBlock, type InlineExample, type JsonExample } from './Example.ts'
import { Heading } from './Heading.ts'
import { InlineCode } from './InlineCode.ts'
import { MediaTypes } from './MediaTypes.ts'
import { UnresolvedMarker } from './Unresolved.ts'
import { toExample } from '../toExample.ts'
import { toContent } from '../toContent.ts'
import { safeResolve } from '../safeResolve.ts'

type SectionArgs = {
  context: GenerateContextType
  title: string
  schema: OasSchema | OasRef<'schema'> | undefined
  /** The description, trimmed; `undefined` when there is none. */
  description: string | undefined
  /** The document the section is written in. */
  destinationPath: string
  /** The media types to list; empty for none or for the plain single `application/json`. */
  mediaTypes: string[]
  required?: boolean
}

/** One block of a {@link Section}. */
type SectionBlock = Heading | RequiredNote | Description | MediaTypes | DocumentSchema | JsonExample | InlineExample

/**
 * Renders a titled documentation section, such as a request body — the
 * Markdown counterpart of the docs viewer's `Section`: a level-two heading,
 * then each block the section has, separated by a blank line — whether it is
 * required, its description, its media types, its schema as a {@link Schema},
 * and a collated example. Its owner builds it only when it has a schema or a
 * description.
 */
export class Section extends SnippetBase {
  blocks: List<SectionBlock[], '\n\n', 'none'>

  constructor({ context, title, schema, description, destinationPath, mediaTypes, required }: SectionArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.blocks = new List<SectionBlock[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 2, text: title }),
        required === true ? new RequiredNote({ context }) : undefined,
        description ? new Description({ context, description }) : undefined,
        mediaTypes.length > 0 ? new MediaTypes({ context, mediaTypes }) : undefined,
        schema !== undefined
          ? new DocumentSchema({
              context,
              schema: new Schema({ context, name: undefined, schema, required: undefined }),
              documentPath: destinationPath
            })
          : undefined,
        toExampleBlock({ context, example: toExample(schema) })
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type RequiredNoteArgs = {
  context: GenerateContextType
}

/** The note that a section, such as a request body, is required: `**Required.**`. */
class RequiredNote extends SnippetBase {
  constructor({ context }: RequiredNoteArgs) {
    super({ context })
  }

  override toString(): string {
    return '**Required.**'
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
 * heading stays, over the `$ref` and the unresolved marker, so a reader can
 * tell it from an operation that documents no such section.
 */
export class UnresolvedSection extends SnippetBase {
  heading: Heading
  ref: InlineCode
  marker: UnresolvedMarker

  constructor({ context, title, ref }: UnresolvedSectionArgs) {
    super({ context })

    this.heading = new Heading({ context, level: 2, text: title })
    this.ref = new InlineCode({ context, value: ref })
    this.marker = new UnresolvedMarker({ context })
  }

  override toString(): string {
    return `${this.heading}\n\n- ${this.ref} ${this.marker}`
  }
}

type ToRequestBodySectionArgs = {
  context: GenerateContextType
  requestBody: OasRequestBody | OasRef<'requestBody'> | undefined
  /** The document the section is written in. */
  destinationPath: string
}

/**
 * The request body's section, chosen once: an {@link UnresolvedSection} for a
 * body whose `$ref` names nothing, the body's {@link Section} when it has a
 * schema or a description, and `undefined` for an operation that takes no body.
 */
export const toRequestBodySection = ({
  context,
  requestBody,
  destinationPath
}: ToRequestBodySectionArgs): Section | UnresolvedSection | undefined => {
  if (requestBody === undefined) {
    return undefined
  }

  const resolved = safeResolve(requestBody)

  if (resolved === undefined) {
    return requestBody.isRef()
      ? new UnresolvedSection({ context, title: 'Request body', ref: requestBody.$ref })
      : undefined
  }

  const content = toContent(resolved.content)
  const description = resolved.description?.trim()

  return content.schema !== undefined || description
    ? new Section({
        context,
        title: 'Request body',
        schema: content.schema,
        description,
        destinationPath,
        mediaTypes: content.listedMediaTypes,
        required: resolved.required
      })
    : undefined
}
