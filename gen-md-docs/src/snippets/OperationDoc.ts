import {
  SnippetBase,
  type GenerateContextType,
  type OasOperation,
  type OasResponse
} from '@skmtc/core'
import { Frontmatter } from './Frontmatter.ts'
import { Summary } from './Summary.ts'
import { PathMethod } from './PathMethod.ts'
import { Parameters } from './Parameters.ts'
import { Section } from './Section.ts'
import { Definitions } from './Schema.ts'

type OperationDocArgs = {
  context: GenerateContextType
  operation: OasOperation
}

/**
 * Renders a full operation as a Markdown document — the counterpart of the docs
 * viewer's `OperationContent`. Composes the YAML frontmatter (which carries the
 * tags), summary, method/path, the four parameter groups, the request body and
 * the success response, each separated by a blank line; empty sections drop out.
 *
 * `$ref`s throughout the operation render by name and register with one shared
 * {@link Definitions} collector, which appends a "Referenced types" section — so
 * each named type is defined once per document, self-contained and lookup-free.
 */
export class OperationDoc extends SnippetBase {
  parts: SnippetBase[]
  definitions: Definitions

  constructor({ context, operation }: OperationDocArgs) {
    super({ context, stackTrail: operation.stackTrail.clone() })

    const definitions = new Definitions({ context })
    const response = toSuccessResponse(operation)

    this.parts = [
      new Frontmatter({ context, operation }),
      new Summary({ context, summary: operation.summary, description: operation.description }),
      new PathMethod({ context, method: operation.method, path: operation.path }),
      new Parameters({ context, title: 'Path parameters', parameters: operation.toParams(['path']), definitions }),
      new Parameters({ context, title: 'Query parameters', parameters: operation.toParams(['query']), definitions }),
      new Parameters({ context, title: 'Headers', parameters: operation.toParams(['header']), definitions }),
      new Parameters({ context, title: 'Cookies', parameters: operation.toParams(['cookie']), definitions }),
      new Section({
        context,
        title: 'Request body',
        schema: operation.toRequestBody(({ schema }) => schema),
        description: undefined,
        definitions
      }),
      new Section({
        context,
        title: 'Response',
        schema: response?.toSchema(),
        description: response?.description,
        definitions
      })
    ]

    // The body has registered every referenced type; render each one once.
    definitions.build()
    this.definitions = definitions
  }

  override toString(): string {
    const body = this.parts
      .map(part => part.toString())
      .filter(part => part !== '')
      .join('\n\n')

    const definitions = this.definitions.toString()

    return definitions ? `${body}\n\n${definitions}` : body
  }
}

/** The operation's primary success response, resolved — `undefined` when there is none. */
const toSuccessResponse = (operation: OasOperation): OasResponse | undefined => {
  const code = operation.toSuccessResponseCode()

  return code ? operation.responses[code]?.resolve() : undefined
}
