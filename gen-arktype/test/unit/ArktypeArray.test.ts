import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeArray } from '../../src/ArktypeArray.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeArray - array of strings', () => {
  const schemas = {
    StringArray: {
      type: 'array' as const,
      items: { type: 'string' as const }
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeArray = new ArktypeArray({
    context,
    modifiers: { required: true },
    items: { type: 'string' },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeArray.toString(), 'type("string[]")')
})

Deno.test('ArktypeArray - nullable array', () => {
  const schemas = {
    NullableArray: {
      type: 'array' as const,
      items: { type: 'string' as const },
      nullable: true
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeArray = new ArktypeArray({
    context,
    modifiers: { required: true, nullable: true },
    items: { type: 'string' },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeArray.toString(), 'type("string[] | null")')
})

Deno.test('ArktypeArray - optional array', () => {
  const schemas = {
    OptionalArray: {
      type: 'array' as const,
      items: { type: 'string' as const }
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeArray = new ArktypeArray({
    context,
    modifiers: { required: false },
    items: { type: 'string' },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeArray.toString(), 'type("string[] | undefined")')
})