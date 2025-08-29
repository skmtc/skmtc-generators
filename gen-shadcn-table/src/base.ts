import { Identifier, toOperationBase, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import type { EnrichmentSchema } from './enrichments.ts'
import { toEnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnTableBase = toOperationBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier(operation): Identifier {
    const name = `${camelCase(operation.path, { upperFirst: true })}Table`

    return Identifier.createVariable(name)
  },

  toExportPath(operation): string {
    const { name } = this.toIdentifier(operation)

    return join('@', 'tables', `${name}.generated.tsx`)
  }
})
