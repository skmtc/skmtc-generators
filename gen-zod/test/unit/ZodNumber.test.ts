import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodNumber } from '../../src/ZodNumber.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodNumber - basic number type', () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodNumber.toString(), 'z.number()')
})

Deno.test('ZodNumber - nullable number', () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodNumber.toString(), 'z.number().nullable()')
})

Deno.test('ZodNumber - optional number', () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodNumber.toString(), 'z.number().optional()')
})

Deno.test('ZodNumber - optional and nullable number', () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodNumber.toString(), 'z.number().nullable().optional()')
})