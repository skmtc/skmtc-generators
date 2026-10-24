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
import { Loop, Maybe } from '../Maybe.ts'

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
  parts: Loop

  constructor({ context, operation }: OperationDocArgs) {
    super({ context, stackTrail: operation.stackTrail.clone() })

    const referenced = new Loop([], { separator: '\n\n' })
    const definitions = new Definitions({ context, entries: referenced })
    const document = context.document.type === 'oas' ? context.document.value : undefined
    const servers = (document?.servers ?? []).map(server => server.url)
    const requestBody = operation.requestBody ? safeResolve(operation.requestBody) : undefined
    const requestContent = toContent(requestBody?.content)

    this.parts = new Loop(
      [
        new Frontmatter({ context, operation, servers }),
        new Maybe(
          new Loop([
            Maybe.nonEmptyText(operation.summary?.trim(), text => text),
            Maybe.nonEmptyText(operation.description?.trim(), text => text)
          ]),
          () =>
            new Summary({ context, summary: operation.summary, description: operation.description })
        ),
        new PathMethod({ context, method: operation.method, path: operation.path }),
        new Maybe(
          operation.externalDocs,
          externalDocs => new ExternalDocs({ context, externalDocs })
        ),
        Maybe.nonEmpty(
          operation.security ?? document?.security,
          security =>
            new Security({
              context,
              security,
              securitySchemes: document?.components?.securitySchemes
            })
        ),
        Maybe.nonEmpty(
          operation.toParams(['path']),
          parameters =>
            new Parameters({ context, title: 'Path parameters', parameters, definitions })
        ),
        Maybe.nonEmpty(
          operation.toParams(['query']),
          parameters =>
            new Parameters({ context, title: 'Query parameters', parameters, definitions })
        ),
        Maybe.nonEmpty(
          operation.toParams(['header']),
          parameters => new Parameters({ context, title: 'Headers', parameters, definitions })
        ),
        Maybe.nonEmpty(
          operation.toParams(['cookie']),
          parameters => new Parameters({ context, title: 'Cookies', parameters, definitions })
        ),
        new Maybe(
          new Loop([
            requestContent.schema,
            Maybe.nonEmptyText(requestBody?.description?.trim(), text => text)
          ]),
          () =>
            new Section({
              context,
              title: 'Request body',
              schema: requestContent.schema,
              description: requestBody?.description,
              definitions,
              mediaTypes: requestContent.listedMediaTypes,
              required: requestBody?.required
            })
        ),
        Maybe.nonEmpty(
          Object.values(operation.responses),
          () => new Responses({ context, responses: operation.responses, definitions })
        ),
        // `referenced` is filled by `build()` below, after the body has
        // registered every referenced type, so its presence is decided at render.
        new Maybe(referenced, () => definitions)
      ],
      { separator: '\n\n' }
    )

    definitions.build()
  }

  override toString(): string {
    return `${this.parts}`
  }
}
