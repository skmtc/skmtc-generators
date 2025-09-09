import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeInteger } from '../../src/ArktypeInteger.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeInteger - basic integer type', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInteger = new ArktypeInteger({
    context,
    integerSchema: { type: 'integer' },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeInteger.toString(), 'type("number")')
})

Deno.test('ArktypeInteger - with format', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInteger = new ArktypeInteger({
    context,
    integerSchema: { type: 'integer', format: 'int64' },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeInteger.toString(), 'type("number")')
})

Deno.test('ArktypeInteger - nullable integer', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInteger = new ArktypeInteger({
    context,
    integerSchema: { type: 'integer' },
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeInteger.toString(), 'type("number | null")')
})

Deno.test('ArktypeInteger - optional integer', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInteger = new ArktypeInteger({
    context,
    integerSchema: { type: 'integer' },
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeInteger.toString(), 'type("number | undefined")')
})