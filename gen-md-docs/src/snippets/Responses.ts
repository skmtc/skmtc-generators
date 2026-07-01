import { SnippetBase, type GenerateContextType, type OasResponse, type OasRef } from '@skmtc/core'
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
  schema: Schema | undefined
  example: Example

  constructor({ context, code, response, definitions }: ResponseEntryArgs) {
    const content = toContent(response?.content)

    super({ context, stackTrail: content.schema?.stackTrail.clone() })

    this.code = code
    this.description = new Description({ context, description: response?.description })
    this.mediaTypeLine = toMediaTypeLine(content.mediaTypes)
    this.schema = content.schema
      ? new Schema({ context, name: undefined, schema: content.schema, required: undefined, definitions })
      : undefined
    this.example = new Example({ context, example: toExample(content.schema) })
  }

  override toString(): string {
    const description = this.description.toString()
    const heading = description ? `### \`${this.code}\` — ${description}` : `### \`${this.code}\``

    return [heading, this.mediaTypeLine ?? '', this.schema?.toString() ?? '', this.example.toString()]
      .filter(part => part !== '')
      .join('\n\n')
  }
}
