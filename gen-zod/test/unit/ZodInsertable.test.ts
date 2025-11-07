import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodInsertable } from '../../src/ZodInsertable.ts'
import { type RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('ZodInsertable - simple object type', () => {
  const stackTrail = new StackTrail(['TEST'])
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

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodInsertable = context.insertModel(ZodInsertable, 'User' as RefName)

  // Should generate an object with required properties
  assertEquals(`${zodInsertable.toValue()}`, 'z.object({id: z.string(), name: z.string()})')
})

Deno.test('ZodInsertable - object with optional properties', () => {
  const stackTrail = new StackTrail(['TEST'])
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

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodInsertable = context.insertModel(ZodInsertable, 'Product' as RefName)

  assertEquals(
    `${zodInsertable.toValue()}`,
    'z.object({id: z.string(), name: z.string(), description: z.string().optional()})'
  )
})

Deno.test('ZodInsertable - primitive string type', () => {
  const stackTrail = new StackTrail(['TEST'])
  const schemas = {
    UserId: {
      type: 'string' as const
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodInsertable = context.insertModel(ZodInsertable, 'UserId' as RefName)

  assertEquals(`${zodInsertable.toValue()}`, 'z.string()')
})

Deno.test('ZodInsertable - array type', () => {
  const stackTrail = new StackTrail(['TEST'])
  const schemas = {
    UserList: {
      type: 'array' as const,
      items: {
        type: 'string' as const
      }
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodInsertable = context.insertModel(ZodInsertable, 'UserList' as RefName)

  assertEquals(`${zodInsertable.toValue()}`, 'z.array(z.string())')
})

Deno.test('ZodInsertable - union type', () => {
  const stackTrail = new StackTrail(['TEST'])
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodInsertable = context.insertModel(ZodInsertable, 'StringOrNumber' as RefName)

  assertEquals(`${zodInsertable.toValue()}`, 'z.union([z.string(), z.number()])')
})
