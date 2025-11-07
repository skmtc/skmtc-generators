import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeInsertable } from '../../src/ArktypeInsertable.ts'
import { type RefName, StackTrail } from '@skmtc/core'
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

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = context.insertModel(ArktypeInsertable, 'User' as RefName)

  assertEquals(`${arktypeInsertable.toValue()}`, 'type({ name: "string", age: "number" })')
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

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = context.insertModel(ArktypeInsertable, 'Profile' as RefName)

  assertEquals(`${arktypeInsertable.toValue()}`, 'type({ name: "string", "bio?": "string" })')
})

Deno.test('ArktypeInsertable - primitive string type', () => {
  const schemas = {
    UserName: {
      type: 'string' as const
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = context.insertModel(ArktypeInsertable, 'UserName' as RefName)

  assertEquals(`${arktypeInsertable.toValue()}`, 'type("string")')
})

Deno.test('ArktypeInsertable - array type', () => {
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

  const arktypeInsertable = context.insertModel(ArktypeInsertable, 'Tags' as RefName)

  assertEquals(`${arktypeInsertable.toValue()}`, 'type("string[]")')
})

Deno.test('ArktypeInsertable - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const arktypeInsertable = context.insertModel(ArktypeInsertable, 'StringOrNumber' as RefName)

  assertEquals(`${arktypeInsertable.toValue()}`, 'type("string | number")')
})
