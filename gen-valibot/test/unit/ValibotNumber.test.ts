import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotNumber } from '../../src/ValibotNumber.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotNumber - basic number type', () => {
  const valibotNumber = new ValibotNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotNumber.toString(), 'v.number()')
})

Deno.test('ValibotNumber - nullable number', () => {
  const valibotNumber = new ValibotNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotNumber.toString(), 'v.nullable(v.number())')
})

Deno.test('ValibotNumber - optional number', () => {
  const valibotNumber = new ValibotNumber({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotNumber.toString(), 'v.optional(v.number())')
})

Deno.test('ValibotNumber - optional and nullable number', () => {
  const valibotNumber = new ValibotNumber({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotNumber.toString(), 'v.optional(v.nullable(v.number()))')
})