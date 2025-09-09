import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotVoid } from '../../src/ValibotVoid.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotVoid - basic void type', () => {
  const valibotVoid = new ValibotVoid({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotVoid.toString(), 'v.undefined()')
})