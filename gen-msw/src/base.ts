import { camelCase } from '@skmtc/core'
import { sanitizeIdentifier, toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const MswBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ operation }): string {
    const { method, path } = operation
    const name = `${method}${camelCase(path, { upperFirst: true })}Handler`

    return sanitizeIdentifier(name)
  },

  toIdentifierType: () => ({ type: 'variable' }),

  toExportPath(): string {
    return '@/mocks/handlers.generated.ts'
  },

  toEnrichmentSchema
})
