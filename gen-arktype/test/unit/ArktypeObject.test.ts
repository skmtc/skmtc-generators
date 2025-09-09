import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeObject } from '../../src/ArktypeObject.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeObject - simple object with required properties', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeObject = new ArktypeObject({
    context,
    objectSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name', 'age']
    },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeObject.toString(), 'type({ name: "string", age: "number" })')
})

Deno.test('ArktypeObject - object with optional properties', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeObject = new ArktypeObject({
    context,
    objectSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name']
    },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeObject.toString(), 'type({ name: "string", "age?": "number" })')
})

Deno.test('ArktypeObject - empty object', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeObject = new ArktypeObject({
    context,
    objectSchema: { type: 'object' },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeObject.toString(), 'type({})')
})

Deno.test('ArktypeObject - object with additionalProperties', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeObject = new ArktypeObject({
    context,
    objectSchema: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeObject.toString(), 'type("Record<string, string>")')
})

Deno.test('ArktypeObject - object with properties and additionalProperties', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeObject = new ArktypeObject({
    context,
    objectSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: { type: 'number' }
    },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeObject.toString(), 'type("{ name: string } & Record<string, number>")')
})

Deno.test('ArktypeObject - nullable object', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeObject = new ArktypeObject({
    context,
    objectSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    },
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeObject.toString(), 'type("{ name: string } | null")')
})

Deno.test('ArktypeObject - optional object', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeObject = new ArktypeObject({
    context,
    objectSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    },
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeObject.toString(), 'type("{ name: string } | undefined")')
})