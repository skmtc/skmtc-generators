import { Identifier, toOperationBase, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'

export const ShadcnSelectApiBase = toOperationBase<EnrichmentSchema>({
  id: '@skmtc/shadcn-select',

  toEnrichmentSchema,

  toIdentifier(operation): Identifier {
    const name = `${camelCase(operation.path, { upperFirst: true })}Select`

    return Identifier.createVariable(name)
  },

  toExportPath(operation): string {
    const { name } = this.toIdentifier(operation)

    return join('@', 'inputs', `${name}.generated.tsx`)
  }
})
