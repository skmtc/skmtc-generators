import {
  camelCase,
  capitalize,
  Identifier,
  toMethodVerb,
  withVariant
} from '@skmtc/core'
import { toOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnFormBase = toOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier({ operation, variant }): Identifier {
    const verb = capitalize(toMethodVerb(operation.method))
    const base = `${verb}${camelCase(operation.path, { upperFirst: true })}Form`

    // `withVariant` returns `base` unchanged for `'main'` (no suffix)
    // and appends a PascalCased variant suffix otherwise. Internal
    // sibling Projections derive their fallbackName from
    // `settings.identifier.name`, so the variant suffix flows through
    // every model name the form constructs.
    return Identifier.createVariable(withVariant(base, variant))
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
