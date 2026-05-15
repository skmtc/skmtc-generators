import { Identifier, toOasOperationProjectionBase, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnSelectApiBase = toOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier({ operation }): Identifier {
    // Variants-unaware: keep the existing single-variant naming. The
    // engine still passes a variant arg (always 'main' for unconfigured
    // peers); we ignore it here.
    const name = `${camelCase(operation.path, { upperFirst: true })}Select`

    return Identifier.createVariable(name)
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'inputs', `${name}.generated.tsx`)
  }
})
