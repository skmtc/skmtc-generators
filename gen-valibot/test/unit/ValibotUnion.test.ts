import { assertEquals } from '@std/assert'
import { ValibotUnion } from '../../src/ValibotUnion.ts'
import { OasString, OasNumber, OasBoolean, OasObject, OasDiscriminator } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotUnion - simple union with two types', () => {
  const valibotUnion = new ValibotUnion({
    context: toGenerateContext(),
    members: [new OasString({ enums: undefined, format: undefined }), new OasNumber()],
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
    members: [new OasString({ enums: undefined, format: undefined }), new OasNumber()],
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
    members: [new OasString({ enums: undefined, format: undefined }), new OasNumber()],
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
    'v.variant("type", [v.object({type: v.literal("cat"), meow: v.boolean()}), v.object({type: v.literal("dog"), bark: v.boolean()})])'
  )
})

const toPet = ({ kind, nullable, kindEnums }: { kind: string; nullable?: boolean; kindEnums?: string[] }) =>
  new OasObject({
    nullable,
    properties: {
      type: new OasString({ enums: kindEnums ?? [kind], format: undefined }),
      [kind]: new OasBoolean()
    },
    required: ['type', kind],
    additionalProperties: undefined
  })

const toPetUnion = (members: OasObject[]) =>
  new ValibotUnion({
    context: toGenerateContext(),
    members,
    discriminator: new OasDiscriminator({ propertyName: 'type' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

// valibot types v.variant's options as object schemas: `v.nullable(…)` on
// one fails to type-check (Cloudflare's `pages_env_vars`).
Deno.test('ValibotUnion - a discriminator with a nullable member renders v.union', () => {
  assertEquals(
    toPetUnion([toPet({ kind: 'cat', nullable: true }), toPet({ kind: 'dog' })]).toString(),
    'v.union([v.nullable(v.object({type: v.literal("cat"), cat: v.boolean()})), v.object({type: v.literal("dog"), dog: v.boolean()})])'
  )
})

Deno.test('ValibotUnion - a discriminator with a member holding a record renders v.union', () => {
  const withRecord = new OasObject({
    properties: { type: new OasString({ enums: ['bag'], format: undefined }) },
    required: ['type'],
    additionalProperties: new OasString({ enums: undefined, format: undefined })
  })

  assertEquals(
    toPetUnion([withRecord, toPet({ kind: 'dog' })]).toString(),
    'v.union([v.intersect([v.object({type: v.literal("bag")}), v.record(v.string(), v.string())]), v.object({type: v.literal("dog"), dog: v.boolean()})])'
  )
})

// v.variant needs the key in every option, not a literal: it tries the
// options in turn (seven of Cloudflare's discriminated unions).
Deno.test('ValibotUnion - a discriminator whose property holds no literal stays a variant', () => {
  const plain = new OasObject({
    properties: { type: new OasString({ enums: undefined, format: undefined }) },
    required: ['type'],
    additionalProperties: undefined
  })

  assertEquals(
    toPetUnion([plain, toPet({ kind: 'dog' })]).toString(),
    'v.variant("type", [v.object({type: v.string()}), v.object({type: v.literal("dog"), dog: v.boolean()})])'
  )
})

Deno.test('ValibotUnion - a discriminator with a member missing the key renders v.union', () => {
  const keyless = new OasObject({
    properties: { name: new OasString({ enums: undefined, format: undefined }) },
    required: ['name'],
    additionalProperties: undefined
  })

  assertEquals(
    toPetUnion([keyless, toPet({ kind: 'dog' })]).toString(),
    'v.union([v.object({name: v.string()}), v.object({type: v.literal("dog"), dog: v.boolean()})])'
  )
})
