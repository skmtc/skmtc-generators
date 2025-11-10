import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotInsertable } from '../../src/ValibotInsertable.ts'
import { type RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('ValibotInsertable - simple object type', () => {
  const schemas = {
    User: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        name: { type: 'string' as const }
      },
      required: ['id', 'name']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotInsertable = context.insertModel(ValibotInsertable, 'User' as RefName)

  // Should generate an object with required properties
  assertEquals(`${valibotInsertable.toValue()}`, 'v.object({id: v.string(), name: v.string()})')
})

Deno.test('ValibotInsertable - object with optional properties', () => {
  const schemas = {
    Product: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        name: { type: 'string' as const },
        description: { type: 'string' as const }
      },
      required: ['id', 'name']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotInsertable = context.insertModel(ValibotInsertable, 'Product' as RefName)

  assertEquals(
    `${valibotInsertable.toValue()}`,
    'v.object({id: v.string(), name: v.string(), description: v.optional(v.string())})'
  )
})

Deno.test('ValibotInsertable - primitive string type', () => {
  const schemas = {
    UserId: {
      type: 'string' as const
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotInsertable = context.insertModel(ValibotInsertable, 'UserId' as RefName)

  assertEquals(`${valibotInsertable.toValue()}`, 'v.string()')
})

Deno.test('ValibotInsertable - array type', () => {
  const schemas = {
    UserList: {
      type: 'array' as const,
      items: {
        type: 'string' as const
      }
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotInsertable = context.insertModel(ValibotInsertable, 'UserList' as RefName)

  assertEquals(`${valibotInsertable.toValue()}`, 'v.array(v.string())')
})

Deno.test('ValibotInsertable - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotInsertable = context.insertModel(ValibotInsertable, 'StringOrNumber' as RefName)

  assertEquals(`${valibotInsertable.toValue()}`, 'v.union([v.string(), v.number()])')
})
