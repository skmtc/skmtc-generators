import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeUnion } from '../../src/ArktypeUnion.ts'
import { OasString, OasNumber, OasBoolean } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeUnion - simple union with two types', () => {
  const arktypeUnion = new ArktypeUnion({
    context: toGenerateContext(),
    members: [new OasString({ enums: undefined, format: undefined }), new OasNumber()],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number")')
})

Deno.test('ArktypeUnion - union with three types', () => {
  const arktypeUnion = new ArktypeUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber(),
      new OasBoolean()
    ],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number | boolean")')
})

Deno.test('ArktypeUnion - nullable union', () => {
  const arktypeUnion = new ArktypeUnion({
    context: toGenerateContext(),
    members: [new OasString({ enums: undefined, format: undefined }), new OasNumber()],
    discriminator: undefined,
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number | null")')
})

Deno.test('ArktypeUnion - optional union', () => {
  const arktypeUnion = new ArktypeUnion({
    context: toGenerateContext(),
    members: [new OasString({ enums: undefined, format: undefined }), new OasNumber()],
    discriminator: undefined,
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number | undefined")')
})
