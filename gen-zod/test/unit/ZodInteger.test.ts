import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodInteger } from '../../src/ZodInteger.ts'
import { OasInteger } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodInteger - basic integer type', () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodInteger.toString(), 'z.number().int()')
})

Deno.test('ZodInteger - with format', () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: 'int32' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodInteger.toString(), 'z.number().int()')
})

Deno.test('ZodInteger - nullable integer', () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodInteger.toString(), 'z.number().int().nullable()')
})

Deno.test('ZodInteger - optional integer', () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodInteger.toString(), 'z.number().int().optional()')
})