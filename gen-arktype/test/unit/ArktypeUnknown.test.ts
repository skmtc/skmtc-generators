import { assertEquals } from '@std/assert'
import { ArktypeUnknown } from '@skmtc/gen-arktype'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'

Deno.test('ArktypeUnknown - basic unknown type', () => {
  const arktypeUnknown = new ArktypeUnknown({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeUnknown.toString(), '"unknown"')
})
