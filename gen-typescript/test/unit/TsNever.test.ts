import { assertEquals } from '@std/assert'
import { TsNever } from '../../src/TsNever.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('TsNever - basic never type', () => {
  const tsNever = new TsNever({
    context: toGenerateContext(),
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })
  
  assertEquals(tsNever.toString(), 'never')
})