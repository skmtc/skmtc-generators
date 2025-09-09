import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodArray } from '../../src/ZodArray.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ZodArray - array of strings', () => {
  const zodArray = new ZodArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodArray.toString(), 'z.array(z.string())')
})

Deno.test('ZodArray - nullable array', () => {
  const zodArray = new ZodArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodArray.toString(), 'z.array(z.string()).nullable()')
})

Deno.test('ZodArray - optional array', () => {
  const zodArray = new ZodArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-zod' }),
    destinationPath: '/test'
  })

  assertEquals(zodArray.toString(), 'z.array(z.string()).optional()')
})