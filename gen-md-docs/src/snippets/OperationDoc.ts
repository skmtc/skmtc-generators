import { SnippetBase, type GenerateContextType, type OasOperation } from '@skmtc/core'
import { Frontmatter } from './Frontmatter.ts'
import { Summary } from './Summary.ts'
import { PathMethod } from './PathMethod.ts'
import { Security } from './Security.ts'
import { OperationParameters } from './Parameters.ts'
import { RequestBodySection } from './Section.ts'
import { Responses } from './Responses.ts'
import { ExternalDocs } from './ExternalDocs.ts'
import { Definitions } from './Schema.ts'

type OperationDocArgs = {
  context: GenerateContextType
  operation: OasOperation
}

/**
 * Renders a full operation as a Markdown document — the counterpart of the docs
 * viewer's `OperationContent`. Composes the YAML frontmatter (which carries the
 * tags), summary, method/path, the four parameter groups, the request body and
 * every response, each separated by a blank line; empty sections drop out.
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
    const document = context.document.type === 'oas' ? context.document.value : undefined
    const servers = (document?.servers ?? []).map(server => server.url)

    this.parts = [
      new Frontmatter({ context, operation, servers }),
      new Summary({ context, summary: operation.summary, description: operation.description }),
      new PathMethod({ context, method: operation.method, path: operation.path }),
      new ExternalDocs({ context, externalDocs: operation.externalDocs }),
      new Security({
        context,
        security: operation.security ?? document?.security,
        securitySchemes: document?.components?.securitySchemes
      }),
      new OperationParameters({ context, operation, definitions }),
      new RequestBodySection({ context, requestBody: operation.requestBody, definitions }),
      new Responses({ context, responses: operation.responses, definitions })
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
