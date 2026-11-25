import { assertThrows } from '@std/assert'
import { OasString } from '@skmtc/core'
import { toTsValue } from '../../src/Ts.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('toTsValue - a schema type it has no case for fails and names the type', () => {
  // As if core had added a type after this router was written.
  const schema = Object.assign(new OasString({}), { type: 'tuple' })

  assertThrows(
    () => toTsValue({ context: toGenerateContext(), destinationPath: '@/a.generated.ts', schema, required: true }),
    Error,
    'Unhandled schema type: tuple'
  )
})
