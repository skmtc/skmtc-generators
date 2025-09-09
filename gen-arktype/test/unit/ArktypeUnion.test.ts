import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeUnion } from '../../src/ArktypeUnion.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeUnion - simple union with two types', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeUnion = new ArktypeUnion({
    context,
    members: [{ type: 'string' }, { type: 'number' }],
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number")')
})

Deno.test('ArktypeUnion - union with three types', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeUnion = new ArktypeUnion({
    context,
    members: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number | boolean")')
})

Deno.test('ArktypeUnion - nullable union', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeUnion = new ArktypeUnion({
    context,
    members: [{ type: 'string' }, { type: 'number' }],
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number | null")')
})

Deno.test('ArktypeUnion - optional union', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeUnion = new ArktypeUnion({
    context,
    members: [{ type: 'string' }, { type: 'number' }],
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeUnion.toString(), 'type("string | number | undefined")')
})