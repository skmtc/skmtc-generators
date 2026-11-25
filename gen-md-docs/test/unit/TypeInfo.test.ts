import { assertEquals, assertThrows } from '@std/assert'
import { OasArray, OasBoolean, OasInteger, OasObject, OasString, OasUnion, OasUnknown, type OasSchema } from '@skmtc/core'
import { TypeInfo } from '../../src/snippets/TypeInfo.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

/** An inline schema resolves to itself. */
const inline = <S extends OasSchema>(schema: S) => ({ schema, resolved: schema })

Deno.test('TypeInfo - renders a bare type as inline code', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    ...inline(new OasObject({})),
    required: false
  })

  assertEquals(snippet.toString(), '`object`')
})

Deno.test('TypeInfo - appends format and required modifiers in order', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    ...inline(new OasString({ format: 'date-time' })),
    required: true
  })

  assertEquals(snippet.toString(), '`string` date-time required')
})

Deno.test('TypeInfo - renders format, nullable and required in source order', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    ...inline(new OasString({ format: 'email', nullable: true })),
    required: true
  })

  assertEquals(snippet.toString(), '`string` email nullable required')
})

Deno.test('TypeInfo - composes the enum list after the modifiers', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    ...inline(new OasString({ enums: ['active', 'inactive'] })),
    required: true
  })

  assertEquals(snippet.toString(), '`string` required (`active`, `inactive`)')
})

Deno.test('TypeInfo - renders an array as the item type with []', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    ...inline(new OasArray({ items: new OasString({}) })),
    required: false
  })

  assertEquals(snippet.toString(), '`string[]`')
})

Deno.test('TypeInfo - a boolean shows its default, a nullable union its flag, an unknown only its type', () => {
  const context = toGenerateContext()
  const toInfo = (schema: OasSchema, required: boolean) =>
    `${new TypeInfo({ context, ...inline(schema), required })}`

  assertEquals(toInfo(new OasBoolean({ default: true }), true), '`boolean` required (default: `true`)')
  assertEquals(
    toInfo(new OasUnion({ members: [new OasString({}), new OasInteger({})], nullable: true }), false),
    '`union` nullable'
  )
  assertEquals(toInfo(new OasUnknown({}), false), '`unknown`')
})

Deno.test('TypeInfo - an array shows its item counts and whether its items are unique', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    ...inline(new OasArray({ items: new OasString({}), minItems: 1, uniqueItems: true })),
    required: false
  })

  assertEquals(snippet.toString(), '`string[]` (min items: 1, unique items)')
})

Deno.test('TypeInfo - a schema type it has no case for fails and names the type', () => {
  // As if core had added a type after this snippet was written.
  const schema = Object.assign(new OasString({}), { type: 'tuple' })

  assertThrows(
    () => new TypeInfo({ context: toGenerateContext(), ...inline(schema), required: true }),
    Error,
    'Unhandled schema type: tuple'
  )
})
