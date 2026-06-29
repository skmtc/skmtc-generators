import type { GenerateContextType, OasOperation } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { resolveEnrichment, toClassStem } from '@/base.ts'
import type { SdkConfig } from '@/SdkConfig.ts'
import denoJson from '../../deno.json' with { type: 'json' }

export type Flavor = 'blocking' | 'async'

/** One per-resource entry, in CONFIG ORDER (§E-5). */
export type SdkClientResource = {
  /** Accessor name (`agenciesWithCoverage`). */
  accessorName: string
  /** Service class stem (`AgenciesWithCoverage`, `TripDetail`). */
  stem: string
}

export type SdkClientModel = {
  prefix: string
  displayName: string
  resources: SdkClientResource[]
}

/**
 * The client model the four client-file values render over: resources in
 * CONFIG ORDER — the enrichment file's key declaration order (§E-5), the
 * honest mirror of Stainless's config resource order. Built once by the
 * accumulator ({@link import('./ensureClient.ts').ensureClient}); every
 * client file shares it.
 */
export const toClientModel = (context: GenerateContextType, config: SdkConfig): SdkClientModel => {
  invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

  const resolve = resolveEnrichment(context)
  const seen = new Set<string>()
  const resources: SdkClientResource[] = []

  for (const operation of orderedOperations(context)) {
    const enrichment = resolve(operation)

    if (!enrichment) {
      continue
    }

    const accessorName = enrichment.resource[enrichment.resource.length - 1]

    invariant(accessorName, '@skmtc/gen-kotlin-sdk: enrichment resource path is empty')

    if (seen.has(accessorName)) {
      continue
    }

    seen.add(accessorName)
    resources.push({ accessorName, stem: toClassStem(enrichment) })
  }

  return { prefix: config.clientPrefix, displayName: config.displayName, resources }
}

/**
 * Document operations in the enrichment file's declaration order — the honest
 * mirror of Stainless's config resource order.
 */
const orderedOperations = (context: GenerateContextType): OasOperation[] => {
  invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

  const operations = context.document.value.operations
  const enrichmentBlock = context.settings?.enrichments?.[denoJson.name]

  if (!enrichmentBlock || typeof enrichmentBlock !== 'object') {
    return [...operations]
  }

  const pathOrder = new Map(Object.keys(enrichmentBlock).map((path, index) => [path, index]))

  return [...operations].sort(
    (a, b) => (pathOrder.get(a.path) ?? pathOrder.size) - (pathOrder.get(b.path) ?? pathOrder.size)
  )
}

const suffix = (flavor: Flavor) => (flavor === 'async' ? 'Async' : '')

export const flavorDir = (flavor: Flavor): string => (flavor === 'async' ? 'async' : 'blocking')

export const toClientName = (model: SdkClientModel, flavor: Flavor): string =>
  `${model.prefix}Client${suffix(flavor)}`

export const serviceOf = (resource: SdkClientResource, flavor: Flavor): string =>
  `${resource.stem}Service${suffix(flavor)}`
