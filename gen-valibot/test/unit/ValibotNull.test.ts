import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotNull } from '../../src/ValibotNull.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotNull - basic null type', () => {
  const valibotNull = new ValibotNull({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotNull.toString(), 'v.null()')
})
