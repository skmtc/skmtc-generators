import { decapitalize, toEndpointName, withVariant } from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'

export const EffectHttpBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  // Method + path, never operationId — core's `createApi…` convention:
  // `POST /search` is `createApiSearch`.
  toIdentifierName({ operation, variant }): string {
    return withVariant(decapitalize(toEndpointName(operation)), variant)
  },

  toIdentifierType: () => ({ type: 'variable' }),

  // One file per endpoint; the normalized params / body / response schemas
  // co-locate in it. `this` is this base's config, so the file follows the
  // base's own name. A projection that overrides toIdentifierName keeps
  // this file unless it overrides toExportPath too.
  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return `@/client-effect/${name}.generated.ts`
  },

  toEnrichmentSchema,
})
