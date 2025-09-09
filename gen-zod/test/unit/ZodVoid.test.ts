import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodVoid } from '../../src/ZodVoid.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodVoid - basic void type', () => {
  const zodVoid = new ZodVoid({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodVoid.toString(), 'z.void()')
})