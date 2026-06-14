import { camelCase } from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnSelectApiBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifierName({ operation }): string {
    // Variants-unaware: keep the existing single-variant naming. The
    // engine still passes a variant arg (always 'main' for unconfigured
    // peers); we ignore it here.
    const name = `${camelCase(operation.path, { upperFirst: true })}Select`

    return name
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return join('@', 'inputs', `${name}.generated.tsx`)
  }
})
