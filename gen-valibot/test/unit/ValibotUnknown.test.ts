import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotUnknown } from '../../src/ValibotUnknown.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotUnknown - basic unknown type', () => {
  const valibotUnknown = new ValibotUnknown({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotUnknown.toString(), 'v.unknown()')
})