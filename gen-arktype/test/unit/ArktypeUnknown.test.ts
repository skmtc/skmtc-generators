import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeUnknown } from '../../src/ArktypeUnknown.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeUnknown - basic unknown type', () => {
  const arktypeUnknown = new ArktypeUnknown({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeUnknown.toString(), 'type("unknown")')
})
