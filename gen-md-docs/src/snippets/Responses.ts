import {
  SnippetBase,
  type GenerateContextType,
  type OasResponse,
  type OasHeader,
  type OasLink,
  type OasRef
} from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Bullet } from './Bullet.ts'
import { Name } from './Name.ts'
import { Schema } from './Schema.ts'
import { DescriptionClause } from './Description.ts'
import { toExampleBlock, type InlineExample, type JsonExample } from './Example.ts'
import { Heading } from './Heading.ts'
import { InlineCode } from './InlineCode.ts'
import { MediaTypes } from './MediaTypes.ts'
import { UnresolvedMarker } from './Unresolved.ts'
import { toExample } from '../toExample.ts'
import { safeResolve } from '../safeResolve.ts'
import { toContent } from '../toContent.ts'

type ResponsesArgs = {
  context: GenerateContextType
  /** The operation's responses: at least one. */
  responses: Record<string, OasResponse | OasRef<'response'>>
  /** The document the responses are written in. */
  destinationPath: string
}

/**
 * Renders every response of an operation — one `### ` + status-code block per
 * code, with its description, schema and a collated example. Documenting the
 * error responses (their status codes and schemas), not just the success one,
 * is the highest-value content for an agent generating request and error
 * handling. Its owner writes it only when the operation declares a response.
 */
export class Responses extends SnippetBase {
  blocks: List<(Heading | ResponseEntry | UnresolvedResponseEntry)[], '\n\n', 'none'>

  constructor({ context, responses, destinationPath }: ResponsesArgs) {
    super({ context })

    this.blocks = new List<(Heading | ResponseEntry | UnresolvedResponseEntry)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 2, text: 'Responses' }),
        ...Object.entries(responses).map(([code, response]) => {
          const resolved = safeResolve(response)

          return resolved !== undefined
            ? new ResponseEntry({ context, code, response: resolved, destinationPath })
            : new UnresolvedResponseEntry({ context, code })
        })
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type ResponseEntryArgs = {
  context: GenerateContextType
  code: string
  response: OasResponse
  destinationPath: string
}

/** One block of a {@link ResponseEntry}. */
type ResponseBlock =
  | Heading
  | MediaTypes
  | Schema
  | LabeledList<Header | UnresolvedEntry>
  | LabeledList<Link | UnresolvedEntry>
  | JsonExample
  | InlineExample

/**
 * One response: `### ` + status and an em-dash description, then each block it
 * has — its media types, its schema, its headers, its links and an example.
 */
class ResponseEntry extends SnippetBase {
  blocks: List<ResponseBlock[], '\n\n', 'none'>

  constructor({ context, code, response, destinationPath }: ResponseEntryArgs) {
    const content = toContent(response.content)

    super({ context, stackTrail: content.schema?.stackTrail.clone() })

    const description = response.description?.trim()
    const headers = Object.entries(response.headers ?? {})
    const links = Object.entries(response.links ?? {})

    this.blocks = new List<ResponseBlock[], '\n\n', 'none'>(
      [
        new Heading({
          context,
          level: 3,
          text: new List<(InlineCode | DescriptionClause)[], ' ', 'none'>(
            [
              new InlineCode({ context, value: code }),
              description ? new DescriptionClause({ context, description }) : undefined
            ],
            { separator: ' ' }
          )
        }),
        content.listedMediaTypes.length > 0
          ? new MediaTypes({ context, mediaTypes: content.listedMediaTypes })
          : undefined,
        content.schema !== undefined
          ? new Schema({ context, name: undefined, schema: content.schema, required: undefined, destinationPath })
          : undefined,
        headers.length > 0
          ? new LabeledList({
              context,
              label: 'Headers',
              items: headers.map(([name, header]) => {
                const resolved = safeResolve(header)

                return resolved !== undefined
                  ? new Header({ context, name, header: resolved, destinationPath })
                  : new UnresolvedEntry({ context, name })
              })
            })
          : undefined,
        links.length > 0
          ? new LabeledList({
              context,
              label: 'Links',
              items: links.map(([name, link]) => {
                const resolved = safeResolve(link)

                return resolved !== undefined
                  ? new Link({ context, name, link: resolved })
                  : new UnresolvedEntry({ context, name })
              })
            })
          : undefined,
        toExampleBlock({ context, example: toExample(content.schema) })
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type UnresolvedResponseEntryArgs = {
  context: GenerateContextType
  code: string
}

/**
 * A response whose `$ref` names nothing: its status code and the unresolved
 * marker, so a reader can tell it from a code the operation does not document.
 * It has no description, schema or example to show.
 */
class UnresolvedResponseEntry extends SnippetBase {
  heading: Heading

  constructor({ context, code }: UnresolvedResponseEntryArgs) {
    super({ context })

    this.heading = new Heading({
      context,
      level: 3,
      text: new List<(InlineCode | UnresolvedMarker)[], ' ', 'none'>(
        [new InlineCode({ context, value: code }), new UnresolvedMarker({ context })],
        { separator: ' ' }
      )
    })
  }

  override toString(): string {
    return `${this.heading}`
  }
}

type LabeledListArgs<Item> = {
  context: GenerateContextType
  label: string
  /** The items: at least one. */
  items: Item[]
}

/** A bold label over a bullet list: `**Headers**`, then `- …` per item. */
class LabeledList<Item extends SnippetBase> extends SnippetBase {
  label: string
  items: List<Bullet<Item>[], '\n', 'none'>

  constructor({ context, label, items }: LabeledListArgs<Item>) {
    super({ context })

    this.label = label
    this.items = new List(
      items.map(item => new Bullet({ context, item })),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `**${this.label}**\n\n${this.items}`
  }
}

type UnresolvedEntryArgs = {
  context: GenerateContextType
  name: string
}

/**
 * A response header or link whose `$ref` names nothing: its name and the
 * unresolved marker. It has no schema, target or description to show.
 */
class UnresolvedEntry extends SnippetBase {
  name: Name
  marker: UnresolvedMarker

  constructor({ context, name }: UnresolvedEntryArgs) {
    super({ context })

    this.name = new Name({ context, name })
    this.marker = new UnresolvedMarker({ context })
  }

  override toString(): string {
    return `${this.name} ${this.marker}`
  }
}

type HeaderArgs = {
  context: GenerateContextType
  name: string
  header: OasHeader
  destinationPath: string
}

/** One part of a {@link Header}. */
type HeaderPart = Schema | List<(Name | DescriptionClause)[], ' ', 'none'> | DeprecatedNote

/**
 * One response header — its schema (name, type, required, description), or
 * its name and description when it has no schema, then whether it is
 * deprecated.
 */
class Header extends SnippetBase {
  parts: List<HeaderPart[], ' ', 'none'>

  constructor({ context, name, header, destinationPath }: HeaderArgs) {
    super({ context, stackTrail: header.schema?.stackTrail.clone() })

    const description = header.description?.trim()

    this.parts = new List<HeaderPart[], ' ', 'none'>(
      [
        header.schema !== undefined
          ? new Schema({
              context,
              name,
              schema: header.schema,
              required: header.required,
              description: header.description,
              destinationPath
            })
          : new List<(Name | DescriptionClause)[], ' ', 'none'>(
              [
                new Name({ context, name }),
                description ? new DescriptionClause({ context, description }) : undefined
              ],
              { separator: ' ' }
            ),
        header.deprecated === true ? new DeprecatedNote({ context }) : undefined
      ],
      { separator: ' ' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}

type DeprecatedNoteArgs = {
  context: GenerateContextType
}

/** The note that a header is deprecated: `_(deprecated)_`. */
class DeprecatedNote extends SnippetBase {
  constructor({ context }: DeprecatedNoteArgs) {
    super({ context })
  }

  override toString(): string {
    return '_(deprecated)_'
  }
}

type LinkArgs = {
  context: GenerateContextType
  name: string
  link: OasLink
}

/**
 * One response link — a design-time pointer to another operation: its name,
 * the target operation (`operationId` or `operationRef`) and its description.
 */
class Link extends SnippetBase {
  parts: List<(Name | LinkTarget | DescriptionClause)[], ' ', 'none'>

  constructor({ context, name, link }: LinkArgs) {
    super({ context })

    const target = link.operationId ?? link.operationRef
    const description = link.description?.trim()

    this.parts = new List<(Name | LinkTarget | DescriptionClause)[], ' ', 'none'>(
      [
        new Name({ context, name }),
        target !== undefined ? new LinkTarget({ context, target }) : undefined,
        description ? new DescriptionClause({ context, description }) : undefined
      ],
      { separator: ' ' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}

type LinkTargetArgs = {
  context: GenerateContextType
  /** The target's `operationId` or `operationRef`. */
  target: string
}

/** The operation a link points to: ``→ `getPet` ``. */
class LinkTarget extends SnippetBase {
  target: InlineCode

  constructor({ context, target }: LinkTargetArgs) {
    super({ context })

    this.target = new InlineCode({ context, value: target })
  }

  override toString(): string {
    return `→ ${this.target}`
  }
}
