import { assertEquals } from '@std/assert'
import { TsObject } from '../../src/TsObject.ts'
import { toGeneratorOnlyKey, OasString, OasNumber, OasObject } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('TsObject - simple object with required properties', () => {
  const oasObject = new OasObject({
    properties: {
      id: new OasString(),
      name: new OasString()
    },
    required: ['id', 'name']
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsObject.toString(), '{id: string, name: string}')
})

Deno.test('TsObject - object with optional properties', () => {
  const oasObject = new OasObject({
    properties: {
      id: new OasString(),
      name: new OasString(),
      age: new OasNumber({ nullable: true })
    },
    required: ['id']
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(
    tsObject.toString(),
    '{id: string, name?: string | undefined, age?: (number | null) | undefined}'
  )
})

Deno.test('TsObject - empty object', () => {
  const oasObject = new OasObject({})

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsObject.toString(), 'Record<string, never>')
})

Deno.test('TsObject - object with additionalProperties', () => {
  const oasObject = new OasObject({
    additionalProperties: new OasString()
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsObject.toString(), '{[key: string]: string}')
})

// The trap: `{app_id: string} | {[key: string]: unknown}` compiles, but an
// index into a union reads through both members, so `body.app_id` is
// `unknown`. The record goes into the object as an index signature instead.
Deno.test('TsObject - an open object keeps each named property readable as its own type', () => {
  const oasObject = new OasObject({
    properties: {
      app_id: new OasString()
    },
    required: ['app_id'],
    additionalProperties: true
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsObject.toString(), '{app_id: string, [key: string]: unknown}')
})

// The trap: `{id: string, [key: string]: number}` fails with TS2411, because
// every named property must fit the index type. A type shared by two
// properties repeats, which TypeScript reads as the same type.
Deno.test('TsObject - a typed record takes in the type of each named property', () => {
  const oasObject = new OasObject({
    properties: {
      id: new OasString(),
      name: new OasString()
    },
    required: ['id', 'name'],
    additionalProperties: new OasNumber()
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(
    tsObject.toString(),
    '{id: string, name: string, [key: string]: number | string | string}'
  )
})

// The trap: an optional property has the type `T | undefined`, so the index
// type must take in `undefined` too, or TS2411 fires on `age`.
Deno.test('TsObject - a typed record takes in undefined from an optional property', () => {
  const oasObject = new OasObject({
    properties: {
      id: new OasString(),
      age: new OasNumber()
    },
    required: ['id'],
    additionalProperties: new OasString()
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(
    tsObject.toString(),
    '{id: string, age?: number | undefined, [key: string]: string | string | number | undefined}'
  )
})

// The trap: a nullable property has the type `T | null`, so the index type
// must take in `null` too, or TS2411 fires on `note`.
Deno.test('TsObject - a typed record takes in null from a nullable property', () => {
  const oasObject = new OasObject({
    properties: {
      id: new OasString(),
      note: new OasString({ nullable: true })
    },
    required: ['id', 'note'],
    additionalProperties: new OasNumber()
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(
    tsObject.toString(),
    '{id: string, note: string | null, [key: string]: number | string | string | null}'
  )
})

Deno.test('TsObject - nullable object', () => {
  const oasObject = new OasObject({
    properties: {
      name: new OasString()
    },
    required: ['name']
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsObject.toString(), '{name: string} | null')
})

Deno.test('TsObject - optional object', () => {
  const oasObject = new OasObject({
    properties: {
      value: new OasString()
    },
    required: ['value']
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsObject.toString(), '{value: string} | undefined')
})
