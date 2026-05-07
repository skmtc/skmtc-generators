import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsProjection } from '../../src/TsProjection.ts'
import { ContentSettings, RefName, StackTrail } from '@skmtc/core'
import { Identifier } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('TsProjection - simple object type', () => {
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

  const tsProjection = context.insertModel(TsProjection, 'User' as RefName)

  // Should generate an object with required properties
  assertEquals(`${tsProjection.toValue()}`, '{id: string, name: string}')
})

Deno.test('TsProjection - object with optional properties', () => {
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

  const tsProjection = context.insertModel(TsProjection, 'Product' as RefName)

  assertEquals(
    `${tsProjection.toValue()}`,
    '{id: string, name: string, description?: string | undefined}'
  )
})

Deno.test('TsProjection - primitive string type', () => {
  const schemas = {
    UserId: {
      type: 'string' as const
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const tsProjection = context.insertModel(TsProjection, 'UserId' as RefName)

  assertEquals(`${tsProjection.toValue()}`, 'string')
})

Deno.test('TsProjection - array type', () => {
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

  const tsProjection = context.insertModel(TsProjection, 'UserList' as RefName)

  assertEquals(`${tsProjection.toValue()}`, 'Array<string>')
})

Deno.test('TsProjection - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const tsProjection = context.insertModel(TsProjection, 'StringOrNumber' as RefName)

  assertEquals(`${tsProjection.toValue()}`, 'string | number')
})
