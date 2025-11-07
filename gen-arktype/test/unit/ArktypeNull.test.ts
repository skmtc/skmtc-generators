import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeNull } from '../../src/ArktypeNull.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeNull - basic null type', () => {
  const arktypeNull = new ArktypeNull({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeNull.toString(), 'type("null")')
})
