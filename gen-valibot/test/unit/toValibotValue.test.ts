import { assertThrows } from '@std/assert'
import { OasString } from '@skmtc/core'
import { toValibotValue } from '../../src/Valibot.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('toValibotValue - a schema type it has no case for fails and names the type', () => {
  // As if core had added a type after this router was written.
  const schema = Object.assign(new OasString({}), { type: 'tuple' })

  assertThrows(
    () => toValibotValue({ context: toGenerateContext(), destinationPath: '@/a.generated.ts', schema, required: true }),
    Error,
    'Unhandled schema type: tuple'
  )
})
