import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { OasArray, OasObject, OasString } from '@skmtc/core'
import { TypeInfo } from '../../src/snippets/TypeInfo.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('TypeInfo - renders a bare type as inline code', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    schema: new OasObject({}),
    required: false
  })

  assertEquals(snippet.toString(), '`object`')
})

Deno.test('TypeInfo - appends format and required modifiers in order', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    schema: new OasString({ format: 'date-time' }),
    required: true
  })

  assertEquals(snippet.toString(), '`string` date-time required')
})

Deno.test('TypeInfo - renders format, nullable and required in source order', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    schema: new OasString({ format: 'email', nullable: true }),
    required: true
  })

  assertEquals(snippet.toString(), '`string` email nullable required')
})

Deno.test('TypeInfo - composes the enum list after the modifiers', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    schema: new OasString({ enums: ['active', 'inactive'] }),
    required: true
  })

  assertEquals(snippet.toString(), '`string` required (`active`, `inactive`)')
})

Deno.test('TypeInfo - renders an array as the item type with []', () => {
  const snippet = new TypeInfo({
    context: toGenerateContext(),
    schema: new OasArray({ items: new OasString({}) }),
    required: false
  })

  assertEquals(snippet.toString(), '`string[]`')
})
