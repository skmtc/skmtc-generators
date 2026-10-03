import { decapitalize, toEndpointName, withVariant } from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'

/**
 * The folder every endpoint and its barrel are written to. A clone that
 * writes elsewhere changes this one constant.
 */
export const CLIENT_ROOT = '@/client-effect'

/** The barrel every endpoint re-exports itself into. */
export const BARREL_PATH = `${CLIENT_ROOT}/index.generated.ts`

export const EffectHttpBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  // Method + path, never operationId — core's `createApi…` convention:
  // `POST /search` is `createApiSearch`.
  toIdentifierName({ operation, variant }): string {
    return withVariant(decapitalize(toEndpointName(operation)), variant)
  },

  toIdentifierType: () => ({ type: 'variable' }),

  // One file per endpoint under CLIENT_ROOT; the normalized params / body /
  // response schemas co-locate in it. `this` is this base's config, so the
  // file follows the base's own name. A projection that overrides
  // toIdentifierName keeps this file unless it overrides toExportPath too.
  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return `${CLIENT_ROOT}/${name}.generated.ts`
  },

  toEnrichmentSchema,
})
