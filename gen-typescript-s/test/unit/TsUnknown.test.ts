import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsUnknown } from '../../src/TsUnknown.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('TsUnknown - basic unknown type', () => {
  const tsUnknown = new TsUnknown({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsUnknown.toString(), 'unknown')
})
