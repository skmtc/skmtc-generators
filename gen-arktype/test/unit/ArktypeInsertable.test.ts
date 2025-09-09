import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeInsertable } from '../../src/ArktypeInsertable.ts'
import { RefName } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('ArktypeInsertable - simple object type', () => {
  const schemas = {
    User: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const }
      },
      required: ['name', 'age']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = new ArktypeInsertable({
    context,
    refName: 'User' as RefName,
    settings: { enrichments: undefined },
    destinationPath: '/test'
  })

  assertEquals(arktypeInsertable.toString(), 'type({ name: "string", age: "number" })')
})

Deno.test('ArktypeInsertable - object with optional properties', () => {
  const schemas = {
    Profile: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        bio: { type: 'string' as const }
      },
      required: ['name']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = new ArktypeInsertable({
    context,
    refName: 'Profile' as RefName,
    settings: { enrichments: undefined },
    destinationPath: '/test'
  })

  assertEquals(arktypeInsertable.toString(), 'type({ name: "string", "bio?": "string" })')
})

Deno.test('ArktypeInsertable - primitive string type', () => {
  const schemas = {
    UserName: {
      type: 'string' as const
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = new ArktypeInsertable({
    context,
    refName: 'UserName' as RefName,
    settings: { enrichments: undefined },
    destinationPath: '/test'
  })

  assertEquals(arktypeInsertable.toString(), 'type("string")')
})

Deno.test('ArktypeInsertable - array type', () => {
  const schemas = {
    Tags: {
      type: 'array' as const,
      items: { type: 'string' as const }
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = new ArktypeInsertable({
    context,
    refName: 'Tags' as RefName,
    settings: { enrichments: undefined },
    destinationPath: '/test'
  })

  assertEquals(arktypeInsertable.toString(), 'type("string[]")')
})

Deno.test('ArktypeInsertable - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [
        { type: 'string' as const },
        { type: 'number' as const }
      ]
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = new ArktypeInsertable({
    context,
    refName: 'StringOrNumber' as RefName,
    settings: { enrichments: undefined },
    destinationPath: '/test'
  })

  assertEquals(arktypeInsertable.toString(), 'type("string | number")')
})