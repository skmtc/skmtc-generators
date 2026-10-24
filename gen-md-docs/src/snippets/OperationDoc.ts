import { SnippetBase, type GenerateContextType, type OasOperation } from '@skmtc/core'
import { Frontmatter } from './Frontmatter.ts'
import { Summary } from './Summary.ts'
import { PathMethod } from './PathMethod.ts'
import { Security } from './Security.ts'
import { Parameters } from './Parameters.ts'
import { Section } from './Section.ts'
import { Responses } from './Responses.ts'
import { ExternalDocs } from './ExternalDocs.ts'
import { Definitions } from './Schema.ts'
import { safeResolve } from '../safeResolve.ts'
import { toContent } from '../toContent.ts'
import { Loop } from '../Maybe.ts'

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
  content: Loop

  constructor({ context, operation }: OperationDocArgs) {
    super({ context, stackTrail: operation.stackTrail.clone() })

    const definitions = new Definitions({ context })
    const document = context.document.type === 'oas' ? context.document.value : undefined
    const servers = (document?.servers ?? []).map(server => server.url)
    const requestBody = operation.requestBody ? safeResolve(operation.requestBody) : undefined
    const requestContent = toContent(requestBody?.content)

    this.content = new Loop(
      [
        new Frontmatter({ context, operation, servers }),
        new Summary({ context, summary: operation.summary, description: operation.description })
          .content,
        new PathMethod({ context, method: operation.method, path: operation.path }),
        new ExternalDocs({ context, externalDocs: operation.externalDocs }).content,
        new Security({
          context,
          security: operation.security ?? document?.security,
          securitySchemes: document?.components?.securitySchemes
        }).content,
        new Parameters({
          context,
          title: 'Path parameters',
          parameters: operation.toParams(['path']),
          definitions
        }).content,
        new Parameters({
          context,
          title: 'Query parameters',
          parameters: operation.toParams(['query']),
          definitions
        }).content,
        new Parameters({
          context,
          title: 'Headers',
          parameters: operation.toParams(['header']),
          definitions
        }).content,
        new Parameters({
          context,
          title: 'Cookies',
          parameters: operation.toParams(['cookie']),
          definitions
        }).content,
        new Section({
          context,
          title: 'Request body',
          schema: requestContent.schema,
          description: requestBody?.description,
          definitions,
          mediaTypes: requestContent.mediaTypes,
          required: requestBody?.required
        }).content,
        new Responses({ context, responses: operation.responses, definitions }).content,
        // Filled by `build()` below, after the body has registered every referenced type.
        definitions.content
      ],
      { separator: '\n\n' }
    )

    definitions.build()
  }

  override toString(): string {
    return `${this.content}`
  }
}
