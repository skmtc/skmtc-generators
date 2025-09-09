import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodBoolean } from '../../src/ZodBoolean.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodBoolean - basic boolean type', () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodBoolean.toString(), 'z.boolean()')
})

Deno.test('ZodBoolean - nullable boolean', () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodBoolean.toString(), 'z.boolean().nullable()')
})

Deno.test('ZodBoolean - optional boolean', () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodBoolean.toString(), 'z.boolean().optional()')
})

Deno.test('ZodBoolean - optional and nullable boolean', () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodBoolean.toString(), 'z.boolean().nullable().optional()')
})