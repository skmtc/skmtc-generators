import type { OasOperationProjectionConstructorArgs } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { OperationDocBase } from '../base.ts'
import type { EnrichmentSchema } from '../enrichments.ts'
import { Frontmatter } from './Frontmatter.ts'
import { Summary } from './Summary.ts'
import { PathMethod } from './PathMethod.ts'
import { Security } from './Security.ts'
import { OperationParameters } from './Parameters.ts'
import { toRequestBodySection, type Section, type UnresolvedSection } from './Section.ts'
import { Responses } from './Responses.ts'
import { ExternalDocs } from './ExternalDocs.ts'

/** One block of an {@link OperationDoc}. */
type OperationBlock =
  | Frontmatter
  | Summary
  | PathMethod
  | ExternalDocs
  | Security
  | OperationParameters
  | Section
  | UnresolvedSection
  | Responses

/**
 * A full operation as a Markdown document — the counterpart of the docs
 * viewer's `OperationContent`: the YAML frontmatter (which carries the tags),
 * then each part the operation has — summary, method and path, external docs,
 * security, parameters, request body and responses — separated by a blank
 * line.
 *
 * A `$ref` renders by name, and its type is inserted as a `TypeDefinition` in
 * this same document, which writes it once under "Referenced types": the
 * document is self-contained and lookup-free.
 */
export class OperationDoc extends OperationDocBase {
  blocks: List<OperationBlock[], '\n\n', 'none'>

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args)

    const { context, operation, settings } = args
    const destinationPath = settings.exportPath
    const document = context.document.type === 'oas' ? context.document.value : undefined
    const summary = operation.summary?.trim()
    const description = operation.description?.trim()
    const security = operation.security ?? document?.security ?? []
    const parameters = new OperationParameters({ context, operation, destinationPath })

    this.blocks = new List<OperationBlock[], '\n\n', 'none'>(
      [
        new Frontmatter({ context, operation, servers: (document?.servers ?? []).map(server => server.url) }),
        summary || description ? new Summary({ context, summary, description }) : undefined,
        new PathMethod({ context, method: operation.method, path: operation.path }),
        operation.externalDocs !== undefined
          ? new ExternalDocs({ context, externalDocs: operation.externalDocs })
          : undefined,
        security.length > 0
          ? new Security({ context, security, securitySchemes: document?.components?.securitySchemes })
          : undefined,
        parameters.sections.values.length > 0 ? parameters : undefined,
        toRequestBodySection({ context, requestBody: operation.requestBody, destinationPath }),
        Object.keys(operation.responses).length > 0
          ? new Responses({ context, responses: operation.responses, destinationPath })
          : undefined
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}
