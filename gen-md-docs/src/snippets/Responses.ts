import { SnippetBase, type GenerateContextType, type OasResponse, type OasRef } from '@skmtc/core'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'

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
        new ResponseEntry({ context, code, response: response.resolve(), definitions })
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
  response: OasResponse
  definitions?: Definitions
}

/** One response: `### ` + status, an em-dash description, its schema, an example. */
class ResponseEntry extends SnippetBase {
  code: string
  description: Description
  schema: Schema | undefined
  example: Example

  constructor({ context, code, response, definitions }: ResponseEntryArgs) {
    const schema = response.toSchema()

    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.code = code
    this.description = new Description({ context, description: response.description })
    this.schema = schema
      ? new Schema({ context, name: undefined, schema, required: undefined, definitions })
      : undefined
    this.example = new Example({ context, example: toExample(schema) })
  }

  override toString(): string {
    const description = this.description.toString()
    const heading = description ? `### \`${this.code}\` — ${description}` : `### \`${this.code}\``

    return [heading, this.schema?.toString() ?? '', this.example.toString()]
      .filter(part => part !== '')
      .join('\n\n')
  }
}
