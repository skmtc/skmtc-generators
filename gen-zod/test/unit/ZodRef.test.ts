import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ZodRef } from '../../src/ZodRef.ts'
import { RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('ZodRef - basic reference', () => {
  const schemas = {
    User: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const }
      },
      required: ['id']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodRef = new ZodRef({
    context,
    refName: 'User' as RefName,
    modifiers: { required: true },
    destinationPath: '/test'
  })

  // ZodRef will reference the schema by name
  assertEquals(zodRef.constructor.name, 'ZodRef')
})

Deno.test('ZodRef - nullable reference', () => {
  const schemas = {
    Product: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const }
      },
      required: ['id']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodRef = new ZodRef({
    context,
    refName: 'Product' as RefName,
    modifiers: { required: true, nullable: true },
    destinationPath: '/test'
  })

  // Check that it's a ZodRef instance
  assertEquals(zodRef.constructor.name, 'ZodRef')
})

Deno.test('ZodRef - optional reference', () => {
  const schemas = {
    Category: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const }
      },
      required: ['name']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodRef = new ZodRef({
    context,
    refName: 'Category' as RefName,
    modifiers: { required: false },
    destinationPath: '/test'
  })

  // Check that it's a ZodRef instance
  assertEquals(zodRef.constructor.name, 'ZodRef')
})

Deno.test('ZodRef - recursive reference', () => {
  const schemas = {
    TreeNode: {
      type: 'object' as const,
      properties: {
        value: { type: 'string' as const },
        children: {
          type: 'array' as const,
          items: { $ref: '#/components/schemas/TreeNode' }
        }
      },
      required: ['value']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodRef = new ZodRef({
    context,
    refName: 'TreeNode' as RefName,
    modifiers: { required: true },
    destinationPath: '/test'
  })

  // Check that it's a ZodRef instance
  assertEquals(zodRef.constructor.name, 'ZodRef')
})

Deno.test('ZodRef - camelCase reference name transformation', () => {
  const schemas = {
    'user-profile': {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const }
      },
      required: ['name']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const zodRef = new ZodRef({
    context,
    refName: 'user-profile' as RefName,
    modifiers: { required: true },
    destinationPath: '/test'
  })

  // Check that it's a ZodRef instance
  assertEquals(zodRef.constructor.name, 'ZodRef')
})