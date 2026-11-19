import { assertEquals } from '@std/assert'
import { OasArray, OasObject, OasString, type OasSchema } from '@skmtc/core'
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
