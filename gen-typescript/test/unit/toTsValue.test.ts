import { assertInstanceOf, assertStrictEquals, assertThrows } from '@std/assert'
import { CustomValue, OasString, OasVoid } from '@skmtc/core'
import { toTsValue } from '../../src/Ts.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { TsVoid } from '../../src/TsVoid.ts'

Deno.test('toTsValue - a schema type it has no case for fails and names the type', () => {
  // As if core had added a type after this router was written.
  const schema = Object.assign(new OasString({}), { type: 'tuple' })

  assertThrows(
    () => toTsValue({ context: toGenerateContext(), destinationPath: '@/a.generated.ts', schema, required: true }),
    Error,
    'Unhandled schema type: tuple'
  )
})

Deno.test('toTsValue - a custom value passes through', () => {
  const context = toGenerateContext()
  const custom = new CustomValue({ context, value: 'Custom' })

  assertStrictEquals(toTsValue({ context, destinationPath: '@/a.generated.ts', schema: custom, required: true }), custom)
})

Deno.test('toTsValue - void has its own snippet', () => {
  const value = toTsValue({
    context: toGenerateContext(),
    destinationPath: '@/a.generated.ts',
    schema: OasVoid.empty(),
    required: true,
  })

  assertInstanceOf(value, TsVoid)
})
