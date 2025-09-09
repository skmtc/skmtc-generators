import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotBoolean } from '../../src/ValibotBoolean.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotBoolean - basic boolean type', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.boolean()')
})

Deno.test('ValibotBoolean - nullable boolean', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.nullable(v.boolean())')
})

Deno.test('ValibotBoolean - optional boolean', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.optional(v.boolean())')
})

Deno.test('ValibotBoolean - optional and nullable boolean', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.optional(v.nullable(v.boolean()))')
})