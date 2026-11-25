import { assertEquals, assertInstanceOf, assertThrows } from '@std/assert'
import { CustomValue, OasString, OasVoid } from '@skmtc/core'
import { toArktypeValue } from '../../src/Arktype.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { ArktypeVoid } from '../../src/ArktypeVoid.ts'

Deno.test('toArktypeValue - a schema type it has no case for fails and names the type', () => {
  // As if core had added a type after this router was written.
  const schema = Object.assign(new OasString({}), { type: 'tuple' })

  assertThrows(
    () => toArktypeValue({ context: toGenerateContext(), destinationPath: '@/a.generated.ts', schema, required: true }),
    Error,
    'Unhandled schema type: tuple'
  )
})

Deno.test('toArktypeValue - a custom value passes through', () => {
  const context = toGenerateContext()
  const custom = new CustomValue({ context, value: 'Custom' })

  assertEquals(`${toArktypeValue({ context, destinationPath: '@/a.generated.ts', schema: custom, required: true })}`, 'Custom')
})

Deno.test('toArktypeValue - void has its own snippet', () => {
  const value = toArktypeValue({
    context: toGenerateContext(),
    destinationPath: '@/a.generated.ts',
    schema: OasVoid.empty(),
    required: true,
  })

  assertInstanceOf(value, ArktypeVoid)
})
