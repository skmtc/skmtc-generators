import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsRef } from '../../src/TsRef.ts'
import { OasRef, type RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toTsValue } from '@skmtc/gen-typescript'

Deno.test('TsRef - basic reference', () => {
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

  const tsRef = new TsRef({
    context: toGenerateContext({ oasDocument }),
    destinationPath: '/test',
    refName: 'User' as RefName,
    modifiers: { required: true }
  })

  // TsRef toString() should return the generated identifier
  assertEquals(tsRef.toString(), 'User')
})

Deno.test('TsRef - nullable reference', () => {
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

  const tsRef = new TsRef({
    context: toGenerateContext({ oasDocument }),
    destinationPath: '/test',
    refName: 'Product' as RefName,
    modifiers: { required: true, nullable: true }
  })

  assertEquals(tsRef.toString(), 'Product | null')
})

Deno.test('TsRef - optional reference', () => {
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

  const tsRef = new TsRef({
    context: toGenerateContext({ oasDocument }),
    destinationPath: '/test',
    refName: 'Category' as RefName,
    modifiers: { required: false }
  })

  assertEquals(tsRef.toString(), 'Category | undefined')
})

Deno.test('TsRef - recursive reference', () => {
  const schemas = {
    Category: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        parent: { $ref: '#/components/schemas/Category' }
      },
      required: ['name']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)

  const context = toGenerateContext({ oasDocument })

  const tsRef = toTsValue({
    schema: new OasRef(
      {
        refType: 'schema',
        $ref: '#/components/schemas/Category'
      },
      oasDocument
    ),

    required: true,
    rootRef: 'Category' as RefName,
    context,
    destinationPath: '@/types/category.generated.ts'
  })

  const output = context.toArtifacts(stackTrail)

  const files = Object.fromEntries(
    Array.from(output.files.entries()).map(([path, file]) => {
      return [path, file.toString()]
    })
  )

  assertEquals(tsRef.toString(), 'Category')
  assertEquals(
    files['@/types/category.generated.ts'],
    'export type Category = {name: string, parent?: Category | undefined};\n'
  )
})

Deno.test('TsRef - camelCase reference name transformation', () => {
  const schemas = {
    'user-profile': {
      type: 'object' as const,
      properties: {
        bio: { type: 'string' as const }
      }
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)

  const tsRef = new TsRef({
    context: toGenerateContext({ oasDocument }),
    destinationPath: '/test',
    refName: 'user-profile' as RefName,
    modifiers: { required: true }
  })

  // Should transform kebab-case to PascalCase (actual result is Userprofile)
  assertEquals(tsRef.toString(), 'UserProfile')
})
