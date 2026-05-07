import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotProjection } from '../../src/ValibotProjection.ts'
import { type RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('ValibotProjection - simple object type', () => {
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

  const valibotProjection = context.insertModel(ValibotProjection, 'User' as RefName)

  // Should generate an object with required properties
  assertEquals(`${valibotProjection.toValue()}`, 'v.object({id: v.string(), name: v.string()})')
})

Deno.test('ValibotProjection - object with optional properties', () => {
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

  const valibotProjection = context.insertModel(ValibotProjection, 'Product' as RefName)

  assertEquals(
    `${valibotProjection.toValue()}`,
    'v.object({id: v.string(), name: v.string(), description: v.optional(v.string())})'
  )
})

Deno.test('ValibotProjection - primitive string type', () => {
  const schemas = {
    UserId: {
      type: 'string' as const
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotProjection = context.insertModel(ValibotProjection, 'UserId' as RefName)

  assertEquals(`${valibotProjection.toValue()}`, 'v.string()')
})

Deno.test('ValibotProjection - array type', () => {
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

  const valibotProjection = context.insertModel(ValibotProjection, 'UserList' as RefName)

  assertEquals(`${valibotProjection.toValue()}`, 'v.array(v.string())')
})

Deno.test('ValibotProjection - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotProjection = context.insertModel(ValibotProjection, 'StringOrNumber' as RefName)

  assertEquals(`${valibotProjection.toValue()}`, 'v.union([v.string(), v.number()])')
})
