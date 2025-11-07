import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeArray } from '../../src/ArktypeArray.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeArray - array of strings', () => {
  const arktypeArray = new ArktypeArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeArray.toString(), 'type("string[]")')
})

Deno.test('ArktypeArray - nullable array', () => {
  const arktypeArray = new ArktypeArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeArray.toString(), 'type("string[] | null")')
})

Deno.test('ArktypeArray - optional array', () => {
  const arktypeArray = new ArktypeArray({
    context: toGenerateContext(),
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeArray.toString(), 'type("string[] | undefined")')
})
