import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import invariant from 'tiny-invariant'
import { toResourceClassName, toResourceExportPath } from './resource.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Projection base for an SDK resource class. The cache identity is the
 * resource, not the operation — every operation carrying the same
 * `resource` enrichment resolves to the same `(name, exportPath)` and so
 * accumulates into one `SdkResource` definition.
 *
 * `kind: 'class'` makes the engine render `export class Name <value>` (the
 * block form added to `@skmtc/lang-typescript`), so the projection's value
 * carries the `extends APIResource { … }` heritage + body and the trailing
 * companion declarations.
 */
export const SdkResourceBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ enrichments }): string {
    const resource = enrichments.subject?.resource
    invariant(resource, `${denoJson.name} requires a 'resource' enrichment on every supported operation`)

    return toResourceClassName(resource)
  },

  toIdentifierType: () => ({ kind: 'class' }),

  toExportPath({ enrichments }): string {
    const resource = enrichments.subject?.resource
    invariant(resource, `${denoJson.name} requires a 'resource' enrichment on every supported operation`)

    return toResourceExportPath(resource)
  },

  toEnrichmentSchema
})
