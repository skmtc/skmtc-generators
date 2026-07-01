import {
  MarkdownFile,
  toOasOperationEntry,
  type GenerateContextType,
  type OasOperation
} from '@skmtc/core'
import { OperationDoc } from './snippets/OperationDoc.ts'
import { DocsIndex, type IndexEntry } from './snippets/DocsIndex.ts'
import { toDocsExportPath } from './paths.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

const indexPath = '@/docs/index.md'

/**
 * The gen-md-docs operation entry. Every operation is documentable (no
 * `isSupported` gate): the transform renders each operation as a self-contained
 * Markdown document and accumulates a link to it in the shared `docs/index.md`
 * discovery entry-point.
 */
export const mdDocsEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform: ({ context, operation }) => {
    const destinationPath = toDocsExportPath(operation)

    context.registerMarkdown({
      destinationPath,
      markdown: new OperationDoc({ context, operation })
    })

    addToIndex({ context, operation, destinationPath })
  }
})

export default mdDocsEntry

type AddToIndexArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
}

/** Accumulate the operation into the shared documentation index (create-on-first). */
const addToIndex = ({ context, operation, destinationPath }: AddToIndexArgs): void => {
  const entry = toIndexEntry(operation, destinationPath)
  const existing = context.getFile(indexPath)

  if (existing instanceof MarkdownFile && existing.content instanceof DocsIndex) {
    existing.content.add(entry)

    return
  }

  const title = context.document.type === 'oas' ? context.document.value.info.title : 'API reference'
  const index = new DocsIndex({ context, title })
  index.add(entry)

  context.registerMarkdown({ destinationPath: indexPath, markdown: index })
}

const toIndexEntry = (operation: OasOperation, destinationPath: string): IndexEntry => ({
  tag: operation.tags?.[0] ?? '',
  title:
    operation.summary ??
    operation.operationId ??
    `${operation.method.toUpperCase()} ${operation.path}`,
  link: destinationPath.replace('@/docs/', ''),
  method: operation.method.toUpperCase(),
  path: operation.path
})
