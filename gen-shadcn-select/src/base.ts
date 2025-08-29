import { Identifier, toOperationBase, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnSelectApiBase = toOperationBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier(operation): Identifier {
    const name = `${camelCase(operation.path, { upperFirst: true })}Select`

    return Identifier.createVariable(name)
  },

  toExportPath(operation): string {
    const { name } = this.toIdentifier(operation)

    return join('@', 'inputs', `${name}.generated.tsx`)
  }
})
