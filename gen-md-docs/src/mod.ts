import { toOasOperationEntry } from '@skmtc/core'
import { OperationDoc } from './snippets/OperationDoc.ts'
import { toDocsExportPath } from './paths.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-md-docs operation entry. Every operation is documentable (no
 * `isSupported` gate), so the transform renders each operation as a Markdown
 * document and registers it as one `.generated.md` file.
 */
export const mdDocsEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform: ({ context, operation }) => {
    context.registerMarkdown({
      destinationPath: toDocsExportPath(operation),
      markdown: new OperationDoc({ context, operation })
    })
  }
})

export default mdDocsEntry
