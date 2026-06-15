import invariant from 'tiny-invariant'
import { toOasOperationEntry } from '@skmtc/core'
import { SdkResource } from './SdkResource.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * SDK entry. Every operation that carries a `resource` + `methodName`
 * enrichment accumulates a method onto its resource class
 * ({@link SdkResource}); operations without that enrichment are skipped
 * (the non-defaultable-generator carve-out — `isSupported` stays a pure
 * capability claim, the short-circuit lives here).
 */
export const typescriptSdkEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,

  isSupported: () => true,

  transform: ({ context, operation, variant }) => {
    const enrichments = SdkResource.toEnrichments({ operation, context, variant })
    const subject = enrichments.subject

    if (!subject?.resource || !subject?.methodName) return

    const resource =
      context.findDefinition({
        name: SdkResource.toIdentifierName({ operation, enrichments, variant }),
        exportPath: SdkResource.toExportPath({ operation, enrichments, variant })
      }) ?? context.insertOperation({ projection: SdkResource, operation, variant }).definition

    invariant(resource?.value instanceof SdkResource, 'resource must be an instance of SdkResource')

    resource.value.append(operation, subject.methodName)
  }
})

export default typescriptSdkEntry
