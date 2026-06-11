import * as v from 'valibot'
import type { GenerateContextType, OasOperation } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The per-variant enrichment value gen-csharp-aspnet declares (CD2):
 * `["@skmtc/gen-csharp-aspnet"][path][method].main.serviceMethodName`.
 */
export const operationEnrichmentSchema = v.optional(
  v.object({ serviceMethodName: v.optional(v.string()) })
)

export type OperationEnrichment = v.InferOutput<typeof operationEnrichmentSchema>

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The consumer-supplied method rename (CD2, the spec-28 port):
 * `GetCreditNote` instead of the derived `GetCreditNotesId` — taken
 * VERBATIM (the consumer writes the C# convention; explicit beats a
 * gen-side casing transform). Applies to BOTH the seam signature and
 * the controller action (declaration and delegation stay in lockstep
 * by construction).
 */
export const toServiceMethodName = (
  context: GenerateContextType,
  operation: OasOperation
): string | undefined => {
  const namespace = context.settings?.enrichments?.[denoJson.name]

  if (!isRecord(namespace)) {
    return undefined
  }

  const perPath = namespace[operation.path]
  const perMethod = isRecord(perPath) ? perPath[operation.method] : undefined
  const main = isRecord(perMethod) ? perMethod.main : undefined

  if (!isRecord(main)) {
    return undefined
  }

  return typeof main.serviceMethodName === 'string' ? main.serviceMethodName : undefined
}
