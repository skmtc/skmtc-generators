import { camelCase, capitalize, toMethodVerb, withVariant } from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnFormBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
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

  toIdentifierType: () => ({ type: 'variable' }),

  // Calls ShadcnFormBase by name: `this` is the bound config, never a projection override.
  // Keep the `: string` return type, or the self-reference is circular (TS7022).
  toExportPath({ operation, enrichments, variant }): string {
    const name = ShadcnFormBase.toIdentifierName({ operation, enrichments, variant })

    return `@/forms/${name}.generated.tsx`
  }
})
