import { camelCase, capitalize, Identifier, toMethodVerb, toOperationBase } from '@skmtc/core'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'

export const ShadcnFormBase = toOperationBase<EnrichmentSchema>({
  id: '@skmtc/shadcn-form',

  toEnrichmentSchema,

  toIdentifier(operation): Identifier {
    const verb = capitalize(toMethodVerb(operation.method))
    const name = `${verb}${camelCase(operation.path, { upperFirst: true })}Form`

    return Identifier.createVariable(name)
  },

  toExportPath(operation): string {
    const { name } = this.toIdentifier(operation)

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
