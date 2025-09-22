import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeObject } from '../../src/ArktypeObject.ts'
import { OasObject, OasString, OasNumber } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeObject - simple object with required properties', () => {
  const arktypeObject = new ArktypeObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        name: new OasString({ enums: undefined, format: undefined }),
        age: new OasNumber()
      },
      required: ['name', 'age'],
      additionalProperties: undefined
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeObject.toString(), 'type({ name: "string", age: "number" })')
})

Deno.test('ArktypeObject - object with optional properties', () => {
  const arktypeObject = new ArktypeObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        name: new OasString({ enums: undefined, format: undefined }),
        age: new OasNumber()
      },
      required: ['name'],
      additionalProperties: undefined
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeObject.toString(), 'type({ name: "string", "age?": "number" })')
})

Deno.test('ArktypeObject - empty object', () => {
  const arktypeObject = new ArktypeObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {},
      required: [],
      additionalProperties: undefined
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeObject.toString(), 'type({})')
})

Deno.test('ArktypeObject - object with additionalProperties', () => {
  const arktypeObject = new ArktypeObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {},
      required: [],
      additionalProperties: new OasString({ enums: undefined, format: undefined })
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeObject.toString(), 'type("Record<string, string>")')
})

Deno.test('ArktypeObject - object with properties and additionalProperties', () => {
  const arktypeObject = new ArktypeObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        name: new OasString({ enums: undefined, format: undefined })
      },
      required: ['name'],
      additionalProperties: new OasNumber()
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeObject.toString(), 'type("{ name: string } & Record<string, number>")')
})

Deno.test('ArktypeObject - nullable object', () => {
  const arktypeObject = new ArktypeObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        name: new OasString({ enums: undefined, format: undefined })
      },
      required: ['name'],
      additionalProperties: undefined
    }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeObject.toString(), 'type("{ name: string } | null")')
})

Deno.test('ArktypeObject - optional object', () => {
  const arktypeObject = new ArktypeObject({
    context: toGenerateContext(),
    objectSchema: new OasObject({
      properties: {
        name: new OasString({ enums: undefined, format: undefined })
      },
      required: ['name'],
      additionalProperties: undefined
    }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeObject.toString(), 'type("{ name: string } | undefined")')
})