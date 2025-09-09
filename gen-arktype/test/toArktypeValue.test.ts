import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { toSchemaV3 } from '@skmtc/core'
import { toArktypeValue } from '../src/Arktype.ts'
import type { OpenAPIV3 } from 'openapi-types'
import { toParseContext } from './helpers/toParseContext.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

// Helper to convert schema and get Arktype string
function schemaToArktype(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required = true
): string {
  const parsedSchema = toSchemaV3({ schema, context: toParseContext() })

  const result = toArktypeValue({
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

Deno.test('toArktypeValue - string type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string' }
  assertEquals(schemaToArktype(schema), 'type("string")')
})

Deno.test('toArktypeValue - number type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'number' }
  assertEquals(schemaToArktype(schema), 'type("number")')
})

Deno.test('toArktypeValue - integer type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'integer' }
  assertEquals(schemaToArktype(schema), 'type("number")')
})

Deno.test('toArktypeValue - boolean type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'boolean' }
  assertEquals(schemaToArktype(schema), 'type("boolean")')
})

// ============================================================================
// STRING ENUM/LITERAL TESTS
// ============================================================================

Deno.test('toArktypeValue - string with single enum value', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['active']
  }
  assertEquals(schemaToArktype(schema), 'type("\'active\'")')
})

Deno.test('toArktypeValue - string with multiple enum values', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['active', 'inactive', 'pending']
  }
  assertEquals(schemaToArktype(schema), 'type("\'active\' | \'inactive\' | \'pending\'")')
})

// ============================================================================
// ARRAY TYPE TESTS
// ============================================================================

Deno.test('toArktypeValue - array of strings', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' }
  }
  assertEquals(schemaToArktype(schema), 'type("string[]")')
})

Deno.test('toArktypeValue - array of numbers', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'number' }
  }
  assertEquals(schemaToArktype(schema), 'type("number[]")')
})

Deno.test('toArktypeValue - nested arrays', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'string' }
    }
  }
  assertEquals(schemaToArktype(schema), 'type("string[][]")')
})

Deno.test('toArktypeValue - array of objects', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
    }
  }
  assertEquals(schemaToArktype(schema), 'type("{ name: string }[]")')
})

// ============================================================================
// OBJECT TYPE TESTS
// ============================================================================

Deno.test('toArktypeValue - simple object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name', 'age']
  }
  assertEquals(schemaToArktype(schema), 'type({ name: "string", age: "number" })')
})

Deno.test('toArktypeValue - object with optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  }
  assertEquals(schemaToArktype(schema), 'type({ name: "string", "age?": "number" })')
})

Deno.test('toArktypeValue - empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object'
  }
  assertEquals(schemaToArktype(schema), 'type({})')
})

Deno.test('toArktypeValue - object with additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: { type: 'string' }
  }
  assertEquals(schemaToArktype(schema), 'type("Record<string, string>")')
})

Deno.test('toArktypeValue - object with properties and additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' }
    },
    required: ['name'],
    additionalProperties: { type: 'number' }
  }
  assertEquals(schemaToArktype(schema), 'type("{ name: string } & Record<string, number>")')
})

Deno.test('toArktypeValue - nested object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      }
    },
    required: ['user']
  }
  assertEquals(schemaToArktype(schema), 'type({ user: { name: "string" } })')
})

Deno.test('toArktypeValue - object with special characters in keys', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      'user-name': { type: 'string' },
      'user.email': { type: 'string' }
    },
    required: ['user-name', 'user.email']
  }
  assertEquals(schemaToArktype(schema), 'type({ "user-name": "string", "user.email": "string" })')
})

// ============================================================================
// UNION TYPE TESTS
// ============================================================================

Deno.test('toArktypeValue - simple union (oneOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [
      { type: 'string' },
      { type: 'number' }
    ]
  }
  assertEquals(schemaToArktype(schema), 'type("string | number")')
})

Deno.test('toArktypeValue - simple union (anyOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    anyOf: [
      { type: 'string' },
      { type: 'number' }
    ]
  }
  assertEquals(schemaToArktype(schema), 'type("string | number")')
})

Deno.test('toArktypeValue - union with objects', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [
      {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      },
      {
        type: 'object',
        properties: { count: { type: 'number' } },
        required: ['count']
      }
    ]
  }
  assertEquals(schemaToArktype(schema), 'type("{ name: string } | { count: number }")')
})

// ============================================================================
// NULLABLE AND OPTIONAL TESTS
// ============================================================================

Deno.test('toArktypeValue - nullable string', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string', nullable: true }
  assertEquals(schemaToArktype(schema), 'type("string | null")')
})

Deno.test('toArktypeValue - nullable object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
    nullable: true
  }
  assertEquals(schemaToArktype(schema), 'type("{ name: string } | null")')
})

Deno.test('toArktypeValue - optional property (via required flag)', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string' }
  assertEquals(schemaToArktype(schema, false), 'type("string | undefined")')
})

Deno.test('toArktypeValue - optional and nullable', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string', nullable: true }
  assertEquals(schemaToArktype(schema, false), 'type("string | null | undefined")')
})

Deno.test('toArktypeValue - nullable array', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' },
    nullable: true
  }
  assertEquals(schemaToArktype(schema), 'type("string[] | null")')
})

// ============================================================================
// REFERENCE TESTS
// ============================================================================

Deno.test('toArktypeValue - schema reference', () => {
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

  const schema: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/User' }
  const parsedSchema = toSchemaV3({ schema, context: parseContext })

  const result = toArktypeValue({
    schema: parsedSchema,
    destinationPath: '/test',
    required: true,
    context
  })

  assertEquals(result.toString(), 'user')
})

// ============================================================================
// COMPLEX NESTED SCENARIOS
// ============================================================================

Deno.test('toArktypeValue - deeply nested structure', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                profiles: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['profiles']
            }
          },
          required: ['user']
        }
      }
    },
    required: ['data']
  }
  assertEquals(schemaToArktype(schema), 'type({ data: { user: { profiles: "string[]" } }[] })')
})

Deno.test('toArktypeValue - additionalProperties with boolean true', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: true
  }
  assertEquals(schemaToArktype(schema), 'type("Record<string, unknown>")')
})

Deno.test('toArktypeValue - additionalProperties with empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: {}
  }
  assertEquals(schemaToArktype(schema), 'type("Record<string, unknown>")')
})

Deno.test('toArktypeValue - integer with format', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'integer',
    format: 'int64'
  }
  assertEquals(schemaToArktype(schema), 'type("number")')
})

Deno.test('toArktypeValue - string with format', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    format: 'date-time'
  }
  assertEquals(schemaToArktype(schema), 'type("string")')
})

Deno.test('toArktypeValue - array with nullable items', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'string',
      nullable: true
    }
  }
  assertEquals(schemaToArktype(schema), 'type("(string | null)[]")')
})

Deno.test('toArktypeValue - object with all optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    }
    // No required array means all properties are optional
  }
  assertEquals(schemaToArktype(schema), 'type({ "name?": "string", "age?": "number" })')
})

Deno.test('toArktypeValue - union with nullable member', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [
      { type: 'string', nullable: true },
      { type: 'number' }
    ]
  }
  assertEquals(schemaToArktype(schema), 'type("string | null | number")')
})