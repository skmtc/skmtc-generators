import { assertEquals } from '@std/assert'
import { TsVoid } from '../../src/TsVoid.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('TsVoid - basic void type', () => {
  const tsVoid = new TsVoid({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })
  
  assertEquals(tsVoid.toString(), 'void')
})