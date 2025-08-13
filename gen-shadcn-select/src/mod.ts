import { OasString, toOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/gen-tanstack-query-zod'
import { ShadcnSelectField } from './ShadcnSelectField.ts'
import { ShadcnSelectApiBase } from './base.ts'
import { toTsValue } from '@skmtc/gen-typescript'

export const ShadcnSelectApiEntry = toOperationEntry<EnrichmentSchema>({
  id: '@skmtc/shadcn-select',

  toEnrichmentSchema,

  isSupported: ({ operation }) => operation.method === 'get' && isListResponse(operation),

  transform: ({ context, operation }) => {
    context.insertOperation(ShadcnSelectField, operation)
  },

  toPreviewModule: ({ operation }) => ({
    name: ShadcnSelectApiBase.toIdentifier(operation).name,
    exportPath: ShadcnSelectApiBase.toExportPath(operation),
    group: 'inputs'
  }),

  toMappingModule: ({ context, operation }) => ({
    name: ShadcnSelectApiBase.toIdentifier(operation).name,
    exportPath: ShadcnSelectApiBase.toExportPath(operation),
    group: 'inputs',
    itemType: 'input',
    schema: toTsValue({
      context,
      destinationPath: ShadcnSelectApiBase.toExportPath(operation),
      schema: new OasString(),
      required: true
    })
  })
})
