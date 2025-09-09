import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodUnknown } from '../../src/ZodUnknown.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodUnknown - basic unknown type', () => {
  const zodUnknown = new ZodUnknown({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodUnknown.toString(), 'z.unknown()')
})