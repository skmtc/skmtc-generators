import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeVoid } from '../../src/ArktypeVoid.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeVoid - basic void type', () => {
  const arktypeVoid = new ArktypeVoid({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeVoid.toString(), 'type("void")')
})
