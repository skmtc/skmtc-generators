import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeProjection } from '../../src/ArktypeProjection.ts'
import { type RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('ArktypeProjection - simple object type', () => {
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

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeProjection = context.insertModel(ArktypeProjection, 'User' as RefName)

  assertEquals(`${arktypeProjection.toValue()}`, 'type({ name: "string", age: "number" })')
})

Deno.test('ArktypeProjection - object with optional properties', () => {
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

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeProjection = context.insertModel(ArktypeProjection, 'Profile' as RefName)

  assertEquals(`${arktypeProjection.toValue()}`, 'type({ name: "string", "bio?": "string" })')
})

Deno.test('ArktypeProjection - primitive string type', () => {
  const schemas = {
    UserName: {
      type: 'string' as const
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeProjection = context.insertModel(ArktypeProjection, 'UserName' as RefName)

  assertEquals(`${arktypeProjection.toValue()}`, 'type("string")')
})

Deno.test('ArktypeProjection - array type', () => {
  const schemas = {
    Tags: {
      type: 'array' as const,
      items: { type: 'string' as const }
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeProjection = context.insertModel(ArktypeProjection, 'Tags' as RefName)

  assertEquals(`${arktypeProjection.toValue()}`, 'type("string[]")')
})

Deno.test('ArktypeProjection - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeProjection = context.insertModel(ArktypeProjection, 'StringOrNumber' as RefName)

  assertEquals(`${arktypeProjection.toValue()}`, 'type("string | number")')
})
