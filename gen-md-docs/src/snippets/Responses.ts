import {
  SnippetBase,
  type GenerateContextType,
  type OasResponse,
  type OasHeader,
  type OasRef
} from '@skmtc/core'
import { Name } from './Name.ts'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'
import { safeResolve } from '../safeResolve.ts'
import { toContent, toMediaTypeLine } from '../toContent.ts'

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
 * handling. Renders the empty string when the operation declares no responses.
 */
export class Responses extends SnippetBase {
  entries: ResponseEntry[]

  constructor({ context, responses, definitions }: ResponsesArgs) {
    super({ context })

    this.entries = Object.entries(responses).map(
      ([code, response]) =>
        new ResponseEntry({ context, code, response: safeResolve(response), definitions })
    )
  }

  override toString(): string {
    if (this.entries.length === 0) {
      return ''
    }

    return ['## Responses', ...this.entries.map(entry => entry.toString())].join('\n\n')
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
  code: string
  description: Description
  mediaTypeLine: string | undefined
  headers: Header[]
  schema: Schema | undefined
  example: Example

  constructor({ context, code, response, definitions }: ResponseEntryArgs) {
    const content = toContent(response?.content)

    super({ context, stackTrail: content.schema?.stackTrail.clone() })

    this.code = code
    this.description = new Description({ context, description: response?.description })
    this.mediaTypeLine = toMediaTypeLine(content.mediaTypes)
    this.headers = Object.entries(response?.headers ?? {}).flatMap(([name, header]) => {
      const resolved = safeResolve(header)

      return resolved !== undefined ? [new Header({ context, name, header: resolved, definitions })] : []
    })
    this.schema = content.schema
      ? new Schema({ context, name: undefined, schema: content.schema, required: undefined, definitions })
      : undefined
    this.example = new Example({ context, example: toExample(content.schema) })
  }

  override toString(): string {
    const description = this.description.toString()
    const heading = description ? `### \`${this.code}\` — ${description}` : `### \`${this.code}\``
    const headers =
      this.headers.length > 0
        ? ['**Headers**', this.headers.map(header => `- ${header}`).join('\n')].join('\n\n')
        : ''

    return [heading, this.mediaTypeLine ?? '', this.schema?.toString() ?? '', headers, this.example.toString()]
      .filter(part => part !== '')
      .join('\n\n')
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
  name: Name
  description: Description
  schema: Schema | undefined
  deprecated: boolean

  constructor({ context, name, header, definitions }: HeaderArgs) {
    super({ context, stackTrail: header.schema?.stackTrail.clone() })

    this.name = new Name({ context, name })
    this.description = new Description({ context, description: header.description })
    this.schema = header.schema
      ? new Schema({
          context,
          name,
          schema: header.schema,
          required: header.required,
          description: header.description,
          definitions
        })
      : undefined
    this.deprecated = header.deprecated === true
  }

  override toString(): string {
    const description = this.description.toString()
    const base =
      this.schema?.toString() ??
      [`${this.name}`, description && `— ${description}`].filter(part => part !== '').join(' ')

    return this.deprecated ? `${base} _(deprecated)_` : base
  }
}
