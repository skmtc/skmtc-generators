import { Identifier, camelCase } from '@skmtc/core'
import { toOasOperationProjectionBase, createVariable } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import type { EnrichmentSchema } from './enrichments.ts'
import { toEnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnTableBase = toOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier({ operation }): Identifier {
    const name = `${camelCase(operation.path, { upperFirst: true })}Table`

    return createVariable(name)
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'tables', `${name}.generated.tsx`)
  }
})
