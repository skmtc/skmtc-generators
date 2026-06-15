import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { createClass, createInterface, defineAndRegister } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { resolveEnrichment, toClassStem, toCoreModuleRoot } from '@/base.ts'
import { toSdkConfig } from '@/config.ts'
import type { SdkClientModel } from '@/client/SdkClient.ts'
import { SdkClientImplValue, SdkClientValue } from '@/client/SdkClientValue.ts'
import denoJson from '../../deno.json' with { type: 'json' }

/**
 * The four client-file singletons (note 32 §E-5) —
 * `findDefinition`-guarded, built once per run from the enrichment
 * file's declaration order (the honest mirror of Stainless's config
 * resource order).
 */
export const ensureClient = (context: GenerateContextType): void => {
  const config = toSdkConfig(context)
  const coreModuleRoot = toCoreModuleRoot(config)
  const clientName = `${config.clientPrefix}Client`
  const clientPath = `${coreModuleRoot}/client/${clientName}.kt`

  if (context.findDefinition({ name: clientName, exportPath: clientPath })) {
    return
  }

  invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

  // Resource list in CONFIG ORDER — the enrichment file's key
  // declaration order (§E-5).
  const resolve = resolveEnrichment(context)
  const seen = new Set<string>()
  const resources: SdkClientModel['resources'] = []

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

  const model: SdkClientModel = {
    prefix: config.clientPrefix,
    displayName: config.displayName,
    resources
  }

  const flavors = [
    { flavor: 'blocking', name: clientName },
    { flavor: 'async', name: `${clientName}Async` }
  ] as const

  for (const { flavor, name } of flavors) {
    const interfacePath = `${coreModuleRoot}/client/${name}.kt`
    const implPath = `${coreModuleRoot}/client/${name}Impl.kt`

    const interfaceValue = new SdkClientValue({
      context,
      model,
      flavor,
      basePackage: config.basePackage,
      destinationPath: interfacePath,
      fileHeader: config.fileHeader
    })

    defineAndRegister(context, {
      identifier: createInterface(name),
      value: interfaceValue,
      destinationPath: interfacePath
    })

    const implValue = new SdkClientImplValue({
      context,
      model,
      flavor,
      basePackage: config.basePackage,
      destinationPath: implPath,
      fileHeader: config.fileHeader
    })

    defineAndRegister(context, {
      identifier: createClass(`${name}Impl`),
      value: implValue,
      destinationPath: implPath
    })
  }
}

/**
 * Document operations in the enrichment file's declaration order —
 * the honest mirror of Stainless's config resource order.
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
    (a, b) =>
      (pathOrder.get(a.path) ?? pathOrder.size) - (pathOrder.get(b.path) ?? pathOrder.size)
  )
}
