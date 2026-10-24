import { assertEquals } from '@std/assert'
import { TsInteger } from '../../src/TsInteger.ts'
import { OasInteger, toGeneratorOnlyKey } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

const context = toGenerateContext()

const generatorKey = toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })

Deno.test('TsInteger - basic integer type', () => {
  const tsInteger = new TsInteger({
    context,
    integerSchema: new OasInteger(),
    modifiers: { required: true },
    generatorKey
  })

  assertEquals(tsInteger.toString(), 'number')
})

Deno.test('TsInteger - with format', () => {
  const tsInteger = new TsInteger({
    context,
    integerSchema: new OasInteger({ format: 'int32' }),
    modifiers: { required: true },
    generatorKey
  })

  assertEquals(tsInteger.toString(), 'number')
})

Deno.test('TsInteger - nullable integer', () => {
  const tsInteger = new TsInteger({
    context,
    integerSchema: new OasInteger(),
    modifiers: { required: true, nullable: true },
    generatorKey
  })

  assertEquals(tsInteger.toString(), 'number | null')
})

Deno.test('TsInteger - optional integer', () => {
  const tsInteger = new TsInteger({
    context,
    integerSchema: new OasInteger(),
    modifiers: { required: false },
    generatorKey
  })

  assertEquals(tsInteger.toString(), 'number | undefined')
})
