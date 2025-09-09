import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeNumber } from '../../src/ArktypeNumber.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeNumber - basic number type', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeNumber = new ArktypeNumber({
    context,
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeNumber.toString(), 'type("number")')
})

Deno.test('ArktypeNumber - nullable number', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeNumber = new ArktypeNumber({
    context,
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeNumber.toString(), 'type("number | null")')
})

Deno.test('ArktypeNumber - optional number', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeNumber = new ArktypeNumber({
    context,
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeNumber.toString(), 'type("number | undefined")')
})

Deno.test('ArktypeNumber - optional and nullable number', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeNumber = new ArktypeNumber({
    context,
    modifiers: { required: false, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeNumber.toString(), 'type("number | null | undefined")')
})