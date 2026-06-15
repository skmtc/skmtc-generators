import type { GenerateContextType } from '@skmtc/core'
import { createClass, createInterface, defineAndRegister } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import {
  toClassStem,
  toResourceName,
  toServiceExportPath,
  type ServiceFlavor
} from '@/base.ts'
import type { SdkConfig } from '@/SdkConfig.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { toServiceOperation, type ServiceValueArgs } from '@/services/serviceFacts.ts'
import { SdkServiceImplValue } from '@/services/SdkServiceImplValue.ts'
import { SdkServiceValue } from '@/services/SdkServiceValue.ts'

/**
 * Adds an operation to its resource's four service files (blocking/async ×
 * interface/impl), each an accumulator (note 32 §E-2/3, the gen-msw pattern):
 * the first operation of a resource `defineAndRegister`s the value, every
 * operation `.add()`s its method. No insert, so no per-operation generatorKey
 * collision on the per-resource Definition — no guard, no rescan.
 */
export const ensureServices = (
  context: GenerateContextType,
  operation: Parameters<typeof toServiceOperation>[0]['operation'],
  enrichments: EnrichmentSchema,
  config: SdkConfig
): void => {
  const subject = enrichments.subject

  invariant(subject, '@skmtc/gen-kotlin-sdk: service projection requires an enrichment')

  const stem = toClassStem(subject)
  const method = toServiceOperation({ operation, enrichment: subject, config, stem })

  const ensureFile = <Value extends SdkServiceValue | SdkServiceImplValue>(
    ValueClass: new (args: ServiceValueArgs) => Value,
    toIdentifier: typeof createInterface,
    suffix: string,
    flavor: ServiceFlavor
  ): void => {
    const name = toResourceName({ operation, enrichments }, suffix)
    const exportPath = toServiceExportPath({ operation, enrichments }, flavor, name)
    const existing = context.findDefinition({ name, exportPath })

    if (existing?.value instanceof ValueClass) {
      existing.value.add(method)
      return
    }

    const value = new ValueClass({
      context,
      stem,
      flavor,
      basePackage: config.basePackage,
      destinationPath: exportPath,
      fileHeader: config.fileHeader
    })

    defineAndRegister(context, {
      identifier: toIdentifier(name),
      value,
      destinationPath: exportPath
    })

    value.add(method)
  }

  ensureFile(SdkServiceValue, createInterface, 'Service', 'blocking')
  ensureFile(SdkServiceImplValue, createClass, 'ServiceImpl', 'blocking')
  ensureFile(SdkServiceValue, createInterface, 'ServiceAsync', 'async')
  ensureFile(SdkServiceImplValue, createClass, 'ServiceAsyncImpl', 'async')
}
