import { assertEquals } from '@std/assert'
import { ArktypeNull } from '@skmtc/gen-arktype'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'

Deno.test('ArktypeNull - basic null type', () => {
  const arktypeNull = new ArktypeNull({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeNull.toString(), '"null"')
})
