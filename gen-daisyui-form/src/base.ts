import { camelCase, capitalize, Identifier, toMethodVerb } from '@skmtc/core'
import { toOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const DaisyFormBase = toOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier({ operation }): Identifier {
    const verb = capitalize(toMethodVerb(operation.method))
    const name = `${verb}${camelCase(operation.path, { upperFirst: true })}Form`

    return Identifier.createVariable(name)
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
