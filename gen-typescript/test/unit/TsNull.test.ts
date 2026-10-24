import { assertEquals } from '@std/assert'
import { TsNull } from '../../src/TsNull.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('TsNull - basic null type', () => {
  const tsNull = new TsNull({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsNull.toString(), 'null')
})
