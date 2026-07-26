import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeInteger } from '@skmtc/gen-arktype'
import { OasInteger } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'

Deno.test('ArktypeInteger - basic integer type', () => {
  const arktypeInteger = new ArktypeInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeInteger.toString(), '"number"')
})

Deno.test('ArktypeInteger - with format', () => {
  const arktypeInteger = new ArktypeInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: 'int64' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeInteger.toString(), '"number"')
})

Deno.test('ArktypeInteger - nullable integer', () => {
  const arktypeInteger = new ArktypeInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeInteger.toString(), '"number | null"')
})

Deno.test('ArktypeInteger - optional integer', () => {
  const arktypeInteger = new ArktypeInteger({
    context: toGenerateContext(),
    integerSchema: new OasInteger({ format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeInteger.toString(), '"number | undefined"')
})
