import { assertInstanceOf, assertStrictEquals, assertThrows } from '@std/assert'
import { CustomValue, OasString, OasVoid } from '@skmtc/core'
import { toValibotValue } from '../../src/Valibot.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { ValibotVoid } from '../../src/ValibotVoid.ts'

Deno.test('toValibotValue - a schema type it has no case for fails and names the type', () => {
  // As if core had added a type after this router was written.
  const schema = Object.assign(new OasString({}), { type: 'tuple' })

  assertThrows(
    () => toValibotValue({ context: toGenerateContext(), destinationPath: '@/a.generated.ts', schema, required: true }),
    Error,
    'Unhandled schema type: tuple'
  )
})

Deno.test('toValibotValue - a custom value passes through', () => {
  const context = toGenerateContext()
  const custom = new CustomValue({ context, value: 'Custom' })

  assertStrictEquals(toValibotValue({ context, destinationPath: '@/a.generated.ts', schema: custom, required: true }), custom)
})

Deno.test('toValibotValue - void has its own snippet', () => {
  const value = toValibotValue({
    context: toGenerateContext(),
    destinationPath: '@/a.generated.ts',
    schema: OasVoid.empty(),
    required: true,
  })

  assertInstanceOf(value, ValibotVoid)
})
