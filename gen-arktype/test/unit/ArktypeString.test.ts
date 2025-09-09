import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeString } from '../../src/ArktypeString.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeString - basic string type', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeString = new ArktypeString({
    context,
    stringSchema: { type: 'string' },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeString.toString(), 'type("string")')
})

Deno.test('ArktypeString - single enum value', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeString = new ArktypeString({
    context,
    stringSchema: { type: 'string', enums: ['active'] },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeString.toString(), 'type("\'active\'")')
})

Deno.test('ArktypeString - multiple enum values', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeString = new ArktypeString({
    context,
    stringSchema: { type: 'string', enums: ['active', 'inactive', 'pending'] },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeString.toString(), 'type("\'active\' | \'inactive\' | \'pending\'")')
})

Deno.test('ArktypeString - nullable string', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeString = new ArktypeString({
    context,
    stringSchema: { type: 'string' },
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeString.toString(), 'type("string | null")')
})

Deno.test('ArktypeString - optional string', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeString = new ArktypeString({
    context,
    stringSchema: { type: 'string' },
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeString.toString(), 'type("string | undefined")')
})

Deno.test('ArktypeString - optional and nullable string', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeString = new ArktypeString({
    context,
    stringSchema: { type: 'string' },
    modifiers: { required: false, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeString.toString(), 'type("string | null | undefined")')
})

Deno.test('ArktypeString - with format (should not affect output)', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeString = new ArktypeString({
    context,
    stringSchema: { type: 'string', format: 'date-time' },
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeString.toString(), 'type("string")')
})