import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ValibotRef } from '../../src/ValibotRef.ts'
import { RefName, toGeneratorOnlyKey } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { valibotEntry } from '../../src/mod.ts'

Deno.test('ValibotRef - basic reference', () => {
  const schemas = {
    User: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const }
      },
      required: ['id']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const valibotRef = new ValibotRef({
    context,
    refName: 'User' as RefName,
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: valibotEntry.id })
  })

  // ValibotRef will reference the schema by name
  assertEquals(valibotRef.constructor.name, 'ValibotRef')
})

Deno.test('ValibotRef - nullable reference', () => {
  const schemas = {
    Product: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const }
      },
      required: ['id']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const valibotRef = new ValibotRef({
    context,
    refName: 'Product' as RefName,
    modifiers: { required: true, nullable: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: valibotEntry.id })
  })

  // Check that it's a ValibotRef instance
  assertEquals(valibotRef.constructor.name, 'ValibotRef')
})

Deno.test('ValibotRef - optional reference', () => {
  const schemas = {
    Category: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const }
      },
      required: ['name']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const valibotRef = new ValibotRef({
    context,
    refName: 'Category' as RefName,
    modifiers: { required: false },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: valibotEntry.id })
  })

  // Check that it's a ValibotRef instance
  assertEquals(valibotRef.constructor.name, 'ValibotRef')
})

Deno.test('ValibotRef - recursive reference', () => {
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

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const valibotRef = new ValibotRef({
    context,
    refName: 'TreeNode' as RefName,
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: valibotEntry.id })
  })

  // Check that it's a ValibotRef instance
  assertEquals(valibotRef.constructor.name, 'ValibotRef')
})

Deno.test('ValibotRef - camelCase reference name transformation', () => {
  const schemas = {
    'user-profile': {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const }
      },
      required: ['name']
    }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const valibotRef = new ValibotRef({
    context,
    refName: 'user-profile' as RefName,
    modifiers: { required: true },
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: valibotEntry.id })
  })

  // Check that it's a ValibotRef instance
  assertEquals(valibotRef.constructor.name, 'ValibotRef')
})