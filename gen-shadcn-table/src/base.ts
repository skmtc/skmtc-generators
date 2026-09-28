import { camelCase } from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import type { EnrichmentSchema } from './enrichments.ts'
import { toEnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnTableBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifierName({ operation }): string {
    const name = `${camelCase(operation.path, { upperFirst: true })}Table`

    return name
  },

  toIdentifierType: () => ({ type: 'variable' }),

  // Calls ShadcnTableBase by name: `this` is the bound config, never a projection override.
  // Keep the `: string` return type, or the self-reference is circular (TS7022).
  toExportPath({ operation, enrichments, variant }): string {
    const name = ShadcnTableBase.toIdentifierName({ operation, enrichments, variant })

    return `@/tables/${name}.generated.tsx`
  }
})
