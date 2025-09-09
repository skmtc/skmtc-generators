import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotInteger } from '../../src/ValibotInteger.ts'
import { OasInteger } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotInteger - basic integer type', () => {
  const valibotInteger = new ValibotInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotInteger.toString(), 'v.pipe(v.number(), v.integer())')
})

Deno.test('ValibotInteger - with format', () => {
  const valibotInteger = new ValibotInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: 'int32' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotInteger.toString(), 'v.pipe(v.number(), v.integer())')
})

Deno.test('ValibotInteger - nullable integer', () => {
  const valibotInteger = new ValibotInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotInteger.toString(), 'v.nullable(v.pipe(v.number(), v.integer()))')
})

Deno.test('ValibotInteger - optional integer', () => {
  const valibotInteger = new ValibotInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotInteger.toString(), 'v.optional(v.pipe(v.number(), v.integer()))')
})