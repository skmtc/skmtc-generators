import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotString } from '../../src/ValibotString.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotString - basic string type', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.string()')
})

Deno.test('ValibotString - single enum value', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['value1'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.literal("value1")')
})

Deno.test('ValibotString - multiple enum values', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['val1', 'val2', 'val3'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.picklist(["val1", "val2", "val3"])')
})

Deno.test('ValibotString - nullable string', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.nullable(v.string())')
})

Deno.test('ValibotString - optional string', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.optional(v.string())')
})

Deno.test('ValibotString - optional and nullable string', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.optional(v.nullable(v.string()))')
})

Deno.test('ValibotString - with date-time format', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'date-time' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.pipe(v.string(), v.isoDateTime())')
})