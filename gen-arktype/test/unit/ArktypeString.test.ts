import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeString } from '@skmtc/gen-arktype'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'

Deno.test('ArktypeString - basic string type', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string"')
})

Deno.test('ArktypeString - single enum value', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['active'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"\'active\'"')
})

Deno.test('ArktypeString - multiple enum values', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['active', 'inactive', 'pending'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), "\"'active' | 'inactive' | 'pending'\"")
})

Deno.test('ArktypeString - nullable string', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string | null"')
})

Deno.test('ArktypeString - optional string', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string | undefined"')
})

Deno.test('ArktypeString - optional and nullable string', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string | null | undefined"')
})

Deno.test('ArktypeString - with format (should not affect output)', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'date-time' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string"')
})
