import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeBoolean } from '@skmtc/gen-arktype'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'

Deno.test('ArktypeBoolean - basic boolean type', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), '"boolean"')
})

Deno.test('ArktypeBoolean - nullable boolean', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), '"boolean | null"')
})

Deno.test('ArktypeBoolean - optional boolean', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), '"boolean | undefined"')
})

Deno.test('ArktypeBoolean - optional and nullable boolean', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), '"boolean | null | undefined"')
})
