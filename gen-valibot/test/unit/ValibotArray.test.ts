import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotArray } from '../../src/ValibotArray.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotArray - array of strings', () => {
  const valibotArray = new ValibotArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotArray.toString(), 'v.array(v.string())')
})

Deno.test('ValibotArray - nullable array', () => {
  const valibotArray = new ValibotArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotArray.toString(), 'v.nullable(v.array(v.string()))')
})

Deno.test('ValibotArray - optional array', () => {
  const valibotArray = new ValibotArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotArray.toString(), 'v.optional(v.array(v.string()))')
})
