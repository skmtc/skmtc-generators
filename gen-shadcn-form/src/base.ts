import { camelCase, capitalize, toMethodVerb, withVariant } from '@skmtc/core'
import { toOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnFormBase = toOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifierName({ operation, variant }): string {
    const verb = capitalize(toMethodVerb(operation.method))
    const base = `${verb}${camelCase(operation.path, { upperFirst: true })}Form`

    // `withVariant` returns `base` unchanged for `'main'` (no suffix)
    // and appends a PascalCased variant suffix otherwise. Internal
    // sibling Projections derive their fallbackName from
    // `settings.identifier.name`, so the variant suffix flows through
    // every model name the form constructs.
    return withVariant(base, variant)
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
