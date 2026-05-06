import { synthesizeArgsObject, toGqlOperationEntry } from '@skmtc/core'
import { emitForm } from './ReapitForm.ts'
import denoJson from '../deno.json' with { type: 'json' }

const id = denoJson.name

/**
 * gen-reapit-form: emits one React form component per GraphQL **Mutation**
 * root field, using `@reapit/elements` form primitives, `react-hook-form` +
 * `@hookform/lenses` for state, and a Zod resolver derived from the args
 * object via `gen-zod`.
 */
export const reapitFormEntry = toGqlOperationEntry({
  id,
  isSupported: ({ operation }) =>
    operation.rootKind === 'mutation' && synthesizeArgsObject(operation) !== undefined,
  transform: ({ context, operation, acc }) => {
    if (operation.rootKind !== 'mutation') return acc
    if (synthesizeArgsObject(operation) === undefined) return acc
    emitForm(context, operation)
    return acc
  }
})
