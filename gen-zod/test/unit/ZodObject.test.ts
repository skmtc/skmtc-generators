import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodObject } from '../../src/ZodObject.ts'
import { OasObject, OasString, OasNumber, OasUnknown } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodObject - simple object with required properties', () => {
  const zodObject = new ZodObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined }),
        name: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id', 'name'],
      additionalProperties: undefined
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodObject.toString(), 'z.object({id: z.string(), name: z.string()})')
})

Deno.test('ZodObject - object with optional properties', () => {
  const zodObject = new ZodObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined }),
        description: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id'],
      additionalProperties: undefined
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodObject.toString(), 'z.object({id: z.string(), description: z.string().optional()})')
})

Deno.test('ZodObject - empty object', () => {
  const zodObject = new ZodObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {},
      required: [],
      additionalProperties: undefined
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodObject.toString(), 'z.object({})')
})

Deno.test('ZodObject - object with additionalProperties', () => {
  const zodObject = new ZodObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {},
      required: [],
      additionalProperties: new OasString({ enums: undefined, format: undefined })
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodObject.toString(), 'z.record(z.string(), z.string())')
})

Deno.test('ZodObject - object with properties and additionalProperties', () => {
  const zodObject = new ZodObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id'],
      additionalProperties: new OasNumber()
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodObject.toString(), 'z.object({id: z.string()}).and(z.record(z.string(), z.number()))')
})

Deno.test('ZodObject - nullable object', () => {
  const zodObject = new ZodObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id'],
      additionalProperties: undefined
    }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodObject.toString(), 'z.object({id: z.string()}).nullable()')
})

Deno.test('ZodObject - optional object', () => {
  const zodObject = new ZodObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id'],
      additionalProperties: undefined
    }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodObject.toString(), 'z.object({id: z.string()}).optional()')
})