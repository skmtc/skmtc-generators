import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsInsertable } from '../../src/TsInsertable.ts'
import { ContentSettings, RefName, StackTrail } from '@skmtc/core'
import { Identifier } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('TsInsertable - simple object type', () => {
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

  const tsInsertable = context.insertModel(TsInsertable, 'User' as RefName)

  // Should generate an object with required properties
  assertEquals(`${tsInsertable.toValue()}`, '{id: string, name: string}')
})

Deno.test('TsInsertable - object with optional properties', () => {
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

  const tsInsertable = context.insertModel(TsInsertable, 'Product' as RefName)

  assertEquals(
    `${tsInsertable.toValue()}`,
    '{id: string, name: string, description?: string | undefined}'
  )
})

Deno.test('TsInsertable - primitive string type', () => {
  const schemas = {
    UserId: {
      type: 'string' as const
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const tsInsertable = context.insertModel(TsInsertable, 'UserId' as RefName)

  assertEquals(`${tsInsertable.toValue()}`, 'string')
})

Deno.test('TsInsertable - array type', () => {
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

  const tsInsertable = context.insertModel(TsInsertable, 'UserList' as RefName)

  assertEquals(`${tsInsertable.toValue()}`, 'Array<string>')
})

Deno.test('TsInsertable - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const tsInsertable = context.insertModel(TsInsertable, 'StringOrNumber' as RefName)

  assertEquals(`${tsInsertable.toValue()}`, 'string | number')
})
