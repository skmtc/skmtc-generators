import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const TypescriptBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  // The `name` subject enrichment renames a ref; applied here so the new
  // name flows to the Definition, the export path, and every cross-reference.
  toIdentifierName({ refName, enrichments }): string {
    return enrichments.subject?.name ?? capitalize(camelCase(refName))
  },

  // Objects become `interface` (the Stainless / openai-node shape); enums,
  // unions and scalars stay `type` aliases.
  toIdentifierType(refName, context) {
    const schema = context.resolveSchemaRefOnce(refName, denoJson.name)
    const isObject = !schema.isRef() && schema.type === 'object'

    return { kind: isObject ? 'interface' : 'type' }
  },

  // `exportPath` enrichment co-locates a ref into a given file (e.g. its
  // owning resource file); otherwise one file per model under `@/types`.
  toExportPath({ refName, enrichments, variant }): string {
    const exportPath = enrichments.subject?.exportPath
    if (exportPath) {
      return exportPath
    }

    const name = this.toIdentifierName({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  },

  toEnrichmentSchema
})
