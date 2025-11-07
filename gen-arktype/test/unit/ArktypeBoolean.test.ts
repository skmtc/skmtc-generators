import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeBoolean } from '../../src/ArktypeBoolean.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeBoolean - basic boolean type', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean")')
})

Deno.test('ArktypeBoolean - nullable boolean', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean | null")')
})

Deno.test('ArktypeBoolean - optional boolean', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean | undefined")')
})

Deno.test('ArktypeBoolean - optional and nullable boolean', () => {
  const arktypeBoolean = new ArktypeBoolean({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean | null | undefined")')
})
