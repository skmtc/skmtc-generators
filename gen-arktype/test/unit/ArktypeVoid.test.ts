import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeVoid } from '@skmtc/gen-arktype'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'

Deno.test('ArktypeVoid - basic void type', () => {
  const arktypeVoid = new ArktypeVoid({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeVoid.toString(), '"undefined"')
})
