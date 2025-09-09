import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeRef } from '../../src/ArktypeRef.ts'
import { RefName, toGeneratorOnlyKey } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeRef - basic reference', () => {
  const schemas = {
    User: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const }
      },
      required: ['id']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeRef = new ArktypeRef({
    context,
    refName: 'User' as RefName,
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeRef.toString(), 'user')
})

Deno.test('ArktypeRef - nullable reference', () => {
  const schemas = {
    Product: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const }
      },
      required: ['id']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeRef = new ArktypeRef({
    context,
    refName: 'Product' as RefName,
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeRef.toString(), 'type("product | null")')
})

Deno.test('ArktypeRef - optional reference', () => {
  const schemas = {
    Category: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const }
      },
      required: ['name']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeRef = new ArktypeRef({
    context,
    refName: 'Category' as RefName,
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeRef.toString(), 'type("category | undefined")')
})