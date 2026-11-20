import { assertEquals } from '@std/assert'
import { OasArray, OasBoolean, OasInteger, OasObject, OasString, OasUnion, OasUnknown, type OasSchema } from '@skmtc/core'
import { TypeInfo } from '../../src/snippets/TypeInfo.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

/** The document the snippets are written in, suffixed as the engine names a projection's file. */
const DOC = '@/docs/test.generated.md'

/** An inline schema resolves to itself. */
const inline = <S extends OasSchema>(schema: S) => ({ schema, resolved: schema })

Deno.test('TypeInfo - renders a bare type as inline code', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    destinationPath: DOC,
    ...inline(new OasObject({})),
    required: false
  })

  assertEquals(snippet.toString(), '`object`')
})

Deno.test('TypeInfo - appends format and required modifiers in order', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    destinationPath: DOC,
    ...inline(new OasString({ format: 'date-time' })),
    required: true
  })

  assertEquals(snippet.toString(), '`string` date-time required')
})

Deno.test('TypeInfo - renders format, nullable and required in source order', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    destinationPath: DOC,
    ...inline(new OasString({ format: 'email', nullable: true })),
    required: true
  })

  assertEquals(snippet.toString(), '`string` email nullable required')
})

Deno.test('TypeInfo - composes the enum list after the modifiers', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    destinationPath: DOC,
    ...inline(new OasString({ enums: ['active', 'inactive'] })),
    required: true
  })

  assertEquals(snippet.toString(), '`string` required (`active`, `inactive`)')
})

Deno.test('TypeInfo - renders an array as the item type with []', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    destinationPath: DOC,
    ...inline(new OasArray({ items: new OasString({}) })),
    required: false
  })

  assertEquals(snippet.toString(), '`string[]`')
})

Deno.test('TypeInfo - a boolean shows its default, a nullable union its flag, an unknown only its type', () => {
  const context = toGenerateContext()
  const toInfo = (schema: OasSchema, required: boolean) =>
    `${new TypeInfo({ context, destinationPath: DOC, ...inline(schema), required })}`

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
    destinationPath: DOC,
    ...inline(new OasArray({ items: new OasString({}), minItems: 1, uniqueItems: true })),
    required: false
  })

  assertEquals(snippet.toString(), '`string[]` (min items: 1, unique items)')
})
