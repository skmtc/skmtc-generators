import {
  MarkdownFile,
  toOasOperationEntry,
  type GenerateContextType,
  type OasOperation,
  type Stringable
} from '@skmtc/core'
import { OperationDoc } from './snippets/OperationDoc.ts'
import { TopIndex, TagIndex, Catalog, type IndexEntry, type Server } from './snippets/DocsIndex.ts'
import { toDocsExportPath } from './paths.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

const topIndexPath = '@/docs/index.md'
const catalogPath = '@/docs/index.json'

/**
 * The gen-md-docs operation entry. Every operation is documentable (no
 * `isSupported` gate): the transform renders each operation as a self-contained
 * Markdown document and accumulates it into the discovery indexes — a top-level
 * tag directory (`docs/index.md`), a per-tag index (`docs/<tag>/index.md`), and
 * a machine catalog (`docs/index.json`).
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

    addToIndexes({ context, operation, destinationPath })
  }
})

export default mdDocsEntry

type AddToIndexesArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
}

/** Accumulate the operation into the top index, its per-tag index, and the catalog. */
const addToIndexes = ({ context, operation, destinationPath }: AddToIndexesArgs): void => {
  const entry = toIndexEntry(operation, destinationPath)
  const document = context.document.type === 'oas' ? context.document.value : undefined
  const title = document?.info.title ?? 'API reference'
  const servers: Server[] = (document?.servers ?? []).map(server => ({
    url: server.url,
    description: server.description
  }))

  getOrCreate(
    context,
    topIndexPath,
    (content): content is TopIndex => content instanceof TopIndex,
    () =>
      new TopIndex({
        context,
        title,
        version: document?.info.version,
        description: document?.info.description,
        servers,
        externalDocs: document?.externalDocs,
        securitySchemes: document?.components?.securitySchemes
      })
  ).add(entry)

  getOrCreate(
    context,
    catalogPath,
    (content): content is Catalog => content instanceof Catalog,
    () => new Catalog({ context, title, servers })
  ).add(entry)

  if (entry.tagFolder !== '') {
    // `@/docs/<tag>/<file>.md` -> `@/docs/<tag>/index.md`
    const tagIndexPath = destinationPath.replace(/[^/]+$/, 'index.md')
    const tagName = entry.tags[0] ?? entry.tagFolder

    getOrCreate(
      context,
      tagIndexPath,
      (content): content is TagIndex => content instanceof TagIndex,
      () => {
        const tag = document?.tags?.find(candidate => candidate.name === tagName)

        return new TagIndex({
          context,
          tag: tagName,
          description: tag?.description,
          externalDocs: tag?.externalDocs
        })
      }
    ).add(entry)
  }
}

/** Return the accumulator at `path`, registering a fresh one on first sight. */
const getOrCreate = <T extends Stringable>(
  context: GenerateContextType,
  path: string,
  is: (content: Stringable) => content is T,
  make: () => T
): T => {
  const existing = context.getFile(path)

  if (existing instanceof MarkdownFile && is(existing.content)) {
    return existing.content
  }

  const content = make()
  context.registerMarkdown({ destinationPath: path, markdown: content })

  return content
}

const toIndexEntry = (operation: OasOperation, destinationPath: string): IndexEntry => {
  const link = destinationPath.replace('@/docs/', '')
  const slash = link.lastIndexOf('/')

  return {
    tags: operation.tags ?? [],
    tagFolder: slash >= 0 ? link.slice(0, slash) : '',
    file: slash >= 0 ? link.slice(slash + 1) : link,
    link,
    title:
      operation.summary ??
      operation.operationId ??
      `${operation.method.toUpperCase()} ${operation.path}`,
    method: operation.method.toUpperCase(),
    path: operation.path,
    operationId: operation.operationId
  }
}
