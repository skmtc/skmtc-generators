import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeRef } from '../../src/ArktypeRef.ts'
import { type RefName, toGeneratorOnlyKey } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeRef - basic reference', () => {
  const arktypeRef = new ArktypeRef({
    context: toGenerateContext(),
    refName: 'User' as RefName,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeRef.toString(), 'user')
})

Deno.test('ArktypeRef - nullable reference', () => {
  const arktypeRef = new ArktypeRef({
    context: toGenerateContext(),
    refName: 'Product' as RefName,
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeRef.toString(), 'type("product | null")')
})

Deno.test('ArktypeRef - optional reference', () => {
  const arktypeRef = new ArktypeRef({
    context: toGenerateContext(),
    refName: 'Category' as RefName,
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeRef.toString(), 'type("category | undefined")')
})
