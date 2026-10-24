import {
  SnippetBase,
  type GenerateContextType,
  type OasResponse,
  type OasHeader,
  type OasLink,
  type OasRef
} from '@skmtc/core'
import { Name } from '@/src/snippets/Name.ts'
import { Schema, type Definitions } from '@/src/snippets/Schema.ts'
import { Example } from '@/src/snippets/Example.ts'
import { toExample } from '@/src/toExample.ts'
import { safeResolve } from '@/src/safeResolve.ts'
import { toContent, MediaTypes } from '@/src/toContent.ts'
import { Loop, Maybe, Wrap } from '@/src/Maybe.ts'

type ResponsesArgs = {
  context: GenerateContextType
  responses: Record<string, OasResponse | OasRef<'response'>>
  definitions?: Definitions
}

/**
 * Renders every response of an operation — one `### ` + status-code block per
 * code, with its description, schema and a collated example. Documenting the
 * error responses (their status codes and schemas), not just the success one,
 * is the highest-value content for an agent generating request and error
 * handling. Always renders: the operation builds it only when it declares
 * responses, with `Maybe.nonEmpty(Object.values(responses), () => new Responses(…))`.
 */
export class Responses extends SnippetBase {
  entries: Loop

  constructor({ context, responses, definitions }: ResponsesArgs) {
    super({ context })

    this.entries = new Loop(
      Object.entries(responses).map(
        ([code, response]) =>
          new ResponseEntry({ context, code, response: safeResolve(response), definitions })
      ),
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `## Responses\n\n${this.entries}`
  }
}

type ResponseEntryArgs = {
  context: GenerateContextType
  code: string
  response: OasResponse | undefined
  definitions?: Definitions
}

/** One response: `### ` + status, an em-dash description, its schema, an example.
 * `response` is `undefined` when its `$ref` could not be resolved — the status
 * code still documents, without a schema. */
class ResponseEntry extends SnippetBase {
  content: Loop

  constructor({ context, code, response, definitions }: ResponseEntryArgs) {
    const content = toContent(response?.content)

    super({ context, stackTrail: content.schema?.stackTrail.clone() })

    const headers = new Loop(
      Object.entries(response?.headers ?? {}).map(
        ([name, header]) =>
          new Maybe(
            safeResolve(header),
            resolved =>
              new Wrap(['- ', new Header({ context, name, header: resolved, definitions })])
          )
      ),
      { separator: '\n' }
    )
    const links = new Loop(
      Object.entries(response?.links ?? {}).map(
        ([name, link]) =>
          new Maybe(
            safeResolve(link),
            resolved => new Wrap(['- ', new Link({ context, name, link: resolved })])
          )
      ),
      { separator: '\n' }
    )

    this.content = new Loop(
      [
        new Wrap([
          '### `',
          code,
          '`',
          Maybe.nonEmptyText(response?.description?.trim(), text => new Wrap([' — ', text]))
        ]),
        Maybe.nonEmpty(
          content.listedMediaTypes,
          types => new MediaTypes({ context, mediaTypes: types })
        ),
        new Maybe(
          content.schema,
          schema =>
            new Schema({ context, name: undefined, schema, required: undefined, definitions })
        ),
        new Maybe(headers, loop => new Wrap(['**Headers**\n\n', loop])),
        new Maybe(links, loop => new Wrap(['**Links**\n\n', loop])),
        new Maybe(toExample(content.schema), example => new Example({ context, example }))
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}

type HeaderArgs = {
  context: GenerateContextType
  name: string
  header: OasHeader
  definitions?: Definitions
}

/** One response header — its name, schema (name/type/required/description) and deprecation. */
class Header extends SnippetBase {
  content: Wrap

  constructor({ context, name, header, definitions }: HeaderArgs) {
    super({ context, stackTrail: header.schema?.stackTrail.clone() })

    this.content = new Wrap([
      new Maybe(
        header.schema,
        schema =>
          new Schema({
            context,
            name,
            schema,
            required: header.required,
            description: header.description,
            definitions
          }),
        () =>
          new Loop(
            [
              Maybe.nonEmptyText(name, present => new Name({ context, name: present })),
              Maybe.nonEmptyText(header.description?.trim(), text => new Wrap(['— ', text]))
            ],
            { separator: ' ' }
          )
      ),
      Maybe.when(header.deprecated === true, () => ' _(deprecated)_')
    ])
  }

  override toString(): string {
    return `${this.content}`
  }
}

type LinkArgs = {
  context: GenerateContextType
  name: string
  link: OasLink
}

/**
 * One response link — a design-time pointer to another operation. Renders its
 * name, the target operation (`operationId` or `operationRef`) and description.
 */
class Link extends SnippetBase {
  content: Loop

  constructor({ context, name, link }: LinkArgs) {
    super({ context })

    this.content = new Loop(
      [
        Maybe.nonEmptyText(name, present => new Name({ context, name: present })),
        new Maybe(link.operationId ?? link.operationRef, target => new Wrap(['→ `', target, '`'])),
        Maybe.nonEmptyText(link.description?.trim(), text => new Wrap(['— ', text]))
      ],
      { separator: ' ' }
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}
