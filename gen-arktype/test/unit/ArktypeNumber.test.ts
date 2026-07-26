import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeNumber } from '@skmtc/gen-arktype'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'

Deno.test('ArktypeNumber - basic number type', () => {
  const arktypeNumber = new ArktypeNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeNumber.toString(), '"number"')
})

Deno.test('ArktypeNumber - nullable number', () => {
  const arktypeNumber = new ArktypeNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeNumber.toString(), '"number | null"')
})

Deno.test('ArktypeNumber - optional number', () => {
  const arktypeNumber = new ArktypeNumber({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeNumber.toString(), '"number | undefined"')
})

Deno.test('ArktypeNumber - optional and nullable number', () => {
  const arktypeNumber = new ArktypeNumber({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeNumber.toString(), '"number | null | undefined"')
})
