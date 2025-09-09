import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotUnion } from '../../src/ValibotUnion.ts'
import { OasString, OasNumber, OasBoolean, OasObject, OasDiscriminator } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotUnion - simple union with two types', () => {
  const valibotUnion = new ValibotUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber()
    ],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotUnion.toString(), 'v.union([v.string(), v.number()])')
})

Deno.test('ValibotUnion - union with three types', () => {
  const valibotUnion = new ValibotUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber(),
      new OasBoolean()
    ],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotUnion.toString(), 'v.union([v.string(), v.number(), v.boolean()])')
})

Deno.test('ValibotUnion - nullable union', () => {
  const valibotUnion = new ValibotUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber()
    ],
    discriminator: undefined,
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotUnion.toString(), 'v.nullable(v.union([v.string(), v.number()]))')
})

Deno.test('ValibotUnion - optional union', () => {
  const valibotUnion = new ValibotUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber()
    ],
    discriminator: undefined,
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotUnion.toString(), 'v.optional(v.union([v.string(), v.number()]))')
})

Deno.test('ValibotUnion - union with discriminator', () => {
  const valibotUnion = new ValibotUnion({
    context: toGenerateContext(),
    members: [
      new OasObject({
        properties: {
          type: new OasString({ enums: ['cat'], format: undefined }),
          meow: new OasBoolean()
        },
        required: ['type', 'meow'],
        additionalProperties: undefined
      }),
      new OasObject({
        properties: {
          type: new OasString({ enums: ['dog'], format: undefined }),
          bark: new OasBoolean()
        },
        required: ['type', 'bark'],
        additionalProperties: undefined
      })
    ],
    discriminator: new OasDiscriminator({ propertyName: 'type' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(
    valibotUnion.toString(),
    'v.variant("type", {cat: v.object({type: v.literal("cat"), meow: v.boolean()}), dog: v.object({type: v.literal("dog"), bark: v.boolean()})})'
  )
})