import { assertEquals } from 'jsr:@std/assert@^1.0.0'
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

  assertEquals(tsObject.toString(), '{\nid: string;\n\nname: string;\n}')
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
    '{\nid: string;\n\nname?: string | undefined;\n\nage?: (number | null) | undefined;\n}'
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

  assertEquals(tsObject.toString(), 'Record<string, string>')
})

Deno.test('TsObject - object with properties and additionalProperties', () => {
  const oasObject = new OasObject({
    properties: {
      id: new OasString()
    },
    required: ['id'],
    additionalProperties: new OasNumber()
  })

  const tsObject = new TsObject({
    context: toGenerateContext(),
    destinationPath: '/test',
    value: oasObject,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsObject.toString(), '{\nid: string;\n} | Record<string, number>')
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

  assertEquals(tsObject.toString(), '{\nname: string;\n} | null')
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

  assertEquals(tsObject.toString(), '{\nvalue: string;\n} | undefined')
})
