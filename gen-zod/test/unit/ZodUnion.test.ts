import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodUnion } from '../../src/ZodUnion.ts'
import { OasString, OasNumber, OasBoolean, OasObject, OasDiscriminator } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodUnion - simple union with two types', () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber()
    ],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodUnion.toString(), 'z.union([z.string(), z.number()])')
})

Deno.test('ZodUnion - union with three types', () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber(),
      new OasBoolean()
    ],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodUnion.toString(), 'z.union([z.string(), z.number(), z.boolean()])')
})

Deno.test('ZodUnion - nullable union', () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber()
    ],
    discriminator: undefined,
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodUnion.toString(), 'z.union([z.string(), z.number()]).nullable()')
})

Deno.test('ZodUnion - optional union', () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber()
    ],
    discriminator: undefined,
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodUnion.toString(), 'z.union([z.string(), z.number()]).optional()')
})

Deno.test('ZodUnion - union with discriminator', () => {
  const zodUnion = new ZodUnion({
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
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(
    zodUnion.toString(),
    'z.discriminatedUnion("type", [z.object({type: z.literal("cat"), meow: z.boolean()}), z.object({type: z.literal("dog"), bark: z.boolean()})])'
  )
})