import { Identifier, toOasOperationProjectionBase, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnSelectApiBase = toOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier({ operation }): Identifier {
    const name = `${camelCase(operation.path, { upperFirst: true })}Select`

    return Identifier.createVariable(name)
  },

  toExportPath({ operation, enrichments }): string {
    const { name } = this.toIdentifier({ operation, enrichments })

    return join('@', 'inputs', `${name}.generated.tsx`)
  }
})
