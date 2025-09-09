import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotObject } from '../../src/ValibotObject.ts'
import { OasObject, OasString, OasNumber, OasUnknown } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotObject - simple object with required properties', () => {
  const valibotObject = new ValibotObject({
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
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotObject.toString(), 'v.object({id: v.string(), name: v.string()})')
})

Deno.test('ValibotObject - object with optional properties', () => {
  const valibotObject = new ValibotObject({
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
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotObject.toString(), 'v.object({id: v.string(), description: v.optional(v.string())})')
})

Deno.test('ValibotObject - empty object', () => {
  const valibotObject = new ValibotObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {},
      required: [],
      additionalProperties: undefined
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotObject.toString(), 'v.object({})')
})

Deno.test('ValibotObject - object with additionalProperties', () => {
  const valibotObject = new ValibotObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {},
      required: [],
      additionalProperties: new OasString({ enums: undefined, format: undefined })
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotObject.toString(), 'v.record(v.string(), v.string())')
})

Deno.test('ValibotObject - object with properties and additionalProperties', () => {
  const valibotObject = new ValibotObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id'],
      additionalProperties: new OasNumber()
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotObject.toString(), 'v.intersect([v.object({id: v.string()}), v.record(v.string(), v.number())])')
})

Deno.test('ValibotObject - nullable object', () => {
  const valibotObject = new ValibotObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id'],
      additionalProperties: undefined
    }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotObject.toString(), 'v.nullable(v.object({id: v.string()}))')
})

Deno.test('ValibotObject - optional object', () => {
  const valibotObject = new ValibotObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        id: new OasString({ enums: undefined, format: undefined })
      },
      required: ['id'],
      additionalProperties: undefined
    }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotObject.toString(), 'v.optional(v.object({id: v.string()}))')
})