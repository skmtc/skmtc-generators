import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsNumber } from '../../src/TsNumber.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('TsNumber - basic number type', () => {
  const tsNumber = new TsNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsNumber.toString(), 'number')
})

Deno.test('TsNumber - nullable number', () => {
  const tsNumber = new TsNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsNumber.toString(), 'number | null')
})

Deno.test('TsNumber - optional number', () => {
  const tsNumber = new TsNumber({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsNumber.toString(), 'number | undefined')
})

Deno.test('TsNumber - optional and nullable number', () => {
  const tsNumber = new TsNumber({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsNumber.toString(), '(number | null) | undefined')
})
