import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeBoolean } from '../../src/ArktypeBoolean.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeBoolean - basic boolean type', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeBoolean = new ArktypeBoolean({
    context,
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean")')
})

Deno.test('ArktypeBoolean - nullable boolean', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeBoolean = new ArktypeBoolean({
    context,
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean | null")')
})

Deno.test('ArktypeBoolean - optional boolean', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeBoolean = new ArktypeBoolean({
    context,
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean | undefined")')
})

Deno.test('ArktypeBoolean - optional and nullable boolean', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeBoolean = new ArktypeBoolean({
    context,
    modifiers: { required: false, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeBoolean.toString(), 'type("boolean | null | undefined")')
})