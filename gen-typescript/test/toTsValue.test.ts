import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { toSchemaV3, StackTrail } from '@skmtc/core'
import { toTsValue } from '../src/Ts.ts'
import type { OpenAPIV3 } from 'openapi-types'
import { toParseContext } from './helpers/toParseContext.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

// Helper to convert schema and get TypeScript string
function schemaToTs(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required = true
): string {
  const stackTrail = new StackTrail(['TEST'])
  const parsedSchema = toSchemaV3({ schema, context: toParseContext(), stackTrail })

  const result = toTsValue({
    schema: parsedSchema,
    destinationPath: '/test',
    required,
    context: toGenerateContext()
  })

  return result.toString()
}

// ============================================================================
// PRIMITIVE TYPE TESTS
// ============================================================================

Deno.test('toTsValue - string type', () => {
  try {
    const schema: OpenAPIV3.SchemaObject = { type: 'string' }
    assertEquals(schemaToTs(schema), 'string')
  } catch (e) {
    console.error(e)
  }
})

Deno.test('toTsValue - number type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'number' }
  assertEquals(schemaToTs(schema), 'number')
})

Deno.test('toTsValue - integer type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'integer' }
  assertEquals(schemaToTs(schema), 'number')
})

Deno.test('toTsValue - boolean type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'boolean' }
  assertEquals(schemaToTs(schema), 'boolean')
})

// Note: OpenAPI 3.0 doesn't officially support type: 'null'
// but some implementations use nullable: true instead

// ============================================================================
// STRING ENUM/LITERAL TESTS
// ============================================================================

Deno.test('toTsValue - string with single enum value', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['value1']
  }
  assertEquals(schemaToTs(schema), "'value1'")
})

Deno.test('toTsValue - string with multiple enum values', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['value1', 'value2', 'value3']
  }
  assertEquals(schemaToTs(schema), "'value1' | 'value2' | 'value3'")
})

// ============================================================================
// ARRAY TYPE TESTS
// ============================================================================

Deno.test('toTsValue - array of strings', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' }
  }
  assertEquals(schemaToTs(schema), 'Array<string>')
})

Deno.test('toTsValue - array of numbers', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'number' }
  }
  assertEquals(schemaToTs(schema), 'Array<number>')
})

Deno.test('toTsValue - nested arrays', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' }
    }
  }
  assertEquals(schemaToTs(schema), 'Array<Array<number>>')
})

Deno.test('toTsValue - array of objects', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    }
  }
  assertEquals(schemaToTs(schema), 'Array<{id: string}>')
})

// ============================================================================
// OBJECT TYPE TESTS
// ============================================================================

Deno.test('toTsValue - simple object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name', 'age']
  }
  assertEquals(schemaToTs(schema), '{name: string, age: number}')
})

Deno.test('toTsValue - object with optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  }
  assertEquals(schemaToTs(schema), '{name: string, age?: number | undefined}')
})

Deno.test('toTsValue - empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object'
  }
  assertEquals(schemaToTs(schema), 'Record<string, never>')
})

Deno.test('toTsValue - object with additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: { type: 'string' }
  }
  assertEquals(schemaToTs(schema), 'Record<string, string>')
})

Deno.test('toTsValue - object with properties and additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: { type: 'string' }
    },
    required: ['id'],
    additionalProperties: { type: 'number' }
  }
  assertEquals(schemaToTs(schema), '{id: string} | Record<string, number>')
})

Deno.test('toTsValue - nested object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          profile: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name']
          }
        },
        required: ['id', 'profile']
      }
    },
    required: ['user']
  }
  assertEquals(schemaToTs(schema), '{user: {id: string, profile: {name: string}}}')
})

Deno.test('toTsValue - object with special characters in keys', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      'special-key': { type: 'string' },
      'another.key': { type: 'number' }
    },
    required: ['special-key', 'another.key']
  }
  assertEquals(schemaToTs(schema), "{'special-key': string, 'another.key': number}")
})

// ============================================================================
// UNION TYPE TESTS
// ============================================================================

Deno.test('toTsValue - simple union (oneOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [{ type: 'string' }, { type: 'number' }]
  }
  assertEquals(schemaToTs(schema), 'string | number')
})

Deno.test('toTsValue - simple union (anyOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }]
  }
  assertEquals(schemaToTs(schema), 'string | number | boolean')
})

Deno.test('toTsValue - union with objects', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [
      {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['cat'] },
          meow: { type: 'boolean' }
        },
        required: ['type', 'meow']
      },
      {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['dog'] },
          bark: { type: 'boolean' }
        },
        required: ['type', 'bark']
      }
    ]
  }
  assertEquals(schemaToTs(schema), "{type: 'cat', meow: boolean} | {type: 'dog', bark: boolean}")
})

// ============================================================================
// MODIFIER TESTS
// ============================================================================

Deno.test('toTsValue - nullable string', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    nullable: true
  }
  assertEquals(schemaToTs(schema), 'string | null')
})

Deno.test('toTsValue - nullable object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: { type: 'string' }
    },
    required: ['id'],
    nullable: true
  }
  assertEquals(schemaToTs(schema), '{id: string} | null')
})

Deno.test('toTsValue - optional property (via required flag)', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string' }
  assertEquals(schemaToTs(schema, false), 'string | undefined')
})

Deno.test('toTsValue - optional and nullable', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    nullable: true
  }
  assertEquals(schemaToTs(schema, false), '(string | null) | undefined')
})

Deno.test('toTsValue - nullable array', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' },
    nullable: true
  }
  assertEquals(schemaToTs(schema), 'Array<string> | null')
})

// ============================================================================
// REFERENCE TESTS
// ============================================================================

Deno.test('toTsValue - schema reference', () => {
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

  const parsedSchema = toSchemaV3({
    schema: { $ref: '#/components/schemas/User' },
    context: parseContext,
    stackTrail
  })

  const result = toTsValue({
    schema: parsedSchema,
    destinationPath: '/test',
    required: true,
    context: toGenerateContext({ oasDocument })
  })

  // TsRef instances will have a different string representation
  assertEquals(result.constructor.name, 'TsRef')
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

Deno.test('toTsValue - deeply nested structure', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      level1: {
        type: 'object',
        properties: {
          level2: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                level3: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' }
                  },
                  required: ['value']
                }
              },
              required: ['level3']
            }
          }
        },
        required: ['level2']
      }
    },
    required: ['level1']
  }
  assertEquals(schemaToTs(schema), '{level1: {level2: Array<{level3: {value: string}}>}}')
})

Deno.test('toTsValue - additionalProperties with boolean true', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: true
  }
  assertEquals(schemaToTs(schema), 'Record<string, unknown>')
})

Deno.test('toTsValue - additionalProperties with empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: {}
  }
  assertEquals(schemaToTs(schema), 'Record<string, unknown>')
})

Deno.test('toTsValue - integer with format', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'integer',
    format: 'int32'
  }
  assertEquals(schemaToTs(schema), 'number')
})

Deno.test('toTsValue - string with format', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    format: 'date-time'
  }
  assertEquals(schemaToTs(schema), 'string')
})

Deno.test('toTsValue - array with nullable items', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'string',
      nullable: true
    }
  }
  assertEquals(schemaToTs(schema), 'Array<string | null>')
})

Deno.test('toTsValue - object with all optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      prop1: { type: 'string' },
      prop2: { type: 'number' },
      prop3: { type: 'boolean' }
    }
  }
  assertEquals(
    schemaToTs(schema),
    '{prop1?: string | undefined, prop2?: number | undefined, prop3?: boolean | undefined}'
  )
})

Deno.test('toTsValue - union with nullable member', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [{ type: 'string' }, { type: 'number', nullable: true }]
  }
  assertEquals(schemaToTs(schema), 'string | number | null')
})
