import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodString } from '../../src/ZodString.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodString - basic string type', () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodString.toString(), 'z.string()')
})

Deno.test('ZodString - single enum value', () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['value1'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodString.toString(), 'z.literal("value1")')
})

Deno.test('ZodString - multiple enum values', () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['val1', 'val2', 'val3'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodString.toString(), 'z.enum(["val1", "val2", "val3"])')
})

Deno.test('ZodString - nullable string', () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodString.toString(), 'z.string().nullable()')
})

Deno.test('ZodString - optional string', () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodString.toString(), 'z.string().optional()')
})

Deno.test('ZodString - optional and nullable string', () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodString.toString(), 'z.string().nullable().optional()')
})

// Deno.test('ZodString - with date-time format', () => {
//   const zodString = new ZodString({
//     context: toGenerateContext(),
//     stringSchema: new OasString({ enums: undefined, format: 'date-time' }),
//     modifiers: { required: true },
//     generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
//     destinationPath: '/test'
//   })

//   assertEquals(zodString.toString(), 'z.string().datetime()')
// })
