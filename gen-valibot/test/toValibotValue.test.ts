import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { toSchemaV3, StackTrail } from '@skmtc/core'
import { toValibotValue } from '../src/Valibot.ts'
import type { OpenAPIV3 } from 'openapi-types'
import { toParseContext } from './helpers/toParseContext.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

// Helper to convert schema and get Valibot string
function schemaToValibot(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required = true
): string {
  const stackTrail = new StackTrail(['TEST'])
  const parsedSchema = toSchemaV3({ schema, context: toParseContext(), stackTrail })

  const result = toValibotValue({
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

Deno.test('toValibotValue - string type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string' }
  assertEquals(schemaToValibot(schema), 'v.string()')
})

Deno.test('toValibotValue - number type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'number' }
  assertEquals(schemaToValibot(schema), 'v.number()')
})

Deno.test('toValibotValue - integer type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'integer' }
  assertEquals(schemaToValibot(schema), 'v.pipe(v.number(), v.integer())')
})

Deno.test('toValibotValue - boolean type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'boolean' }
  assertEquals(schemaToValibot(schema), 'v.boolean()')
})

// ============================================================================
// STRING ENUM/LITERAL TESTS
// ============================================================================

Deno.test('toValibotValue - string with single enum value', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['value1']
  }
  assertEquals(schemaToValibot(schema), 'v.literal("value1")')
})

Deno.test('toValibotValue - string with multiple enum values', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['value1', 'value2', 'value3']
  }
  assertEquals(schemaToValibot(schema), 'v.picklist(["value1", "value2", "value3"])')
})

// ============================================================================
// ARRAY TYPE TESTS
// ============================================================================

Deno.test('toValibotValue - array of strings', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' }
  }
  assertEquals(schemaToValibot(schema), 'v.array(v.string())')
})

Deno.test('toValibotValue - array of numbers', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'number' }
  }
  assertEquals(schemaToValibot(schema), 'v.array(v.number())')
})

Deno.test('toValibotValue - nested arrays', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' }
    }
  }
  assertEquals(schemaToValibot(schema), 'v.array(v.array(v.number()))')
})

Deno.test('toValibotValue - array of objects', () => {
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
  assertEquals(schemaToValibot(schema), 'v.array(v.object({id: v.string()}))')
})

// ============================================================================
// OBJECT TYPE TESTS
// ============================================================================

Deno.test('toValibotValue - simple object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name', 'age']
  }
  assertEquals(schemaToValibot(schema), 'v.object({name: v.string(), age: v.number()})')
})

Deno.test('toValibotValue - object with optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  }
  assertEquals(schemaToValibot(schema), 'v.object({name: v.string(), age: v.optional(v.number())})')
})

Deno.test('toValibotValue - empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object'
  }
  assertEquals(schemaToValibot(schema), 'v.object({})')
})

Deno.test('toValibotValue - object with additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: { type: 'string' }
  }
  assertEquals(schemaToValibot(schema), 'v.record(v.string(), v.string())')
})

Deno.test('toValibotValue - object with properties and additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: { type: 'string' }
    },
    required: ['id'],
    additionalProperties: { type: 'number' }
  }
  assertEquals(
    schemaToValibot(schema),
    'v.intersect([v.object({id: v.string()}), v.record(v.string(), v.number())])'
  )
})

Deno.test('toValibotValue - nested object', () => {
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
  assertEquals(
    schemaToValibot(schema),
    'v.object({user: v.object({id: v.string(), profile: v.object({name: v.string()})})})'
  )
})

Deno.test('toValibotValue - object with special characters in keys', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      'special-key': { type: 'string' },
      'another.key': { type: 'number' }
    },
    required: ['special-key', 'another.key']
  }
  assertEquals(
    schemaToValibot(schema),
    'v.object({"special-key": v.string(), "another.key": v.number()})'
  )
})

// ============================================================================
// UNION TYPE TESTS
// ============================================================================

Deno.test('toValibotValue - simple union (oneOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [{ type: 'string' }, { type: 'number' }]
  }
  assertEquals(schemaToValibot(schema), 'v.union([v.string(), v.number()])')
})

Deno.test('toValibotValue - simple union (anyOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }]
  }
  assertEquals(schemaToValibot(schema), 'v.union([v.string(), v.number(), v.boolean()])')
})

Deno.test('toValibotValue - union with objects', () => {
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
  assertEquals(
    schemaToValibot(schema),
    'v.union([v.object({type: v.literal("cat"), meow: v.boolean()}), v.object({type: v.literal("dog"), bark: v.boolean()})])'
  )
})

// ============================================================================
// MODIFIER TESTS
// ============================================================================

Deno.test('toValibotValue - nullable string', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    nullable: true
  }
  assertEquals(schemaToValibot(schema), 'v.nullable(v.string())')
})

Deno.test('toValibotValue - nullable object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: { type: 'string' }
    },
    required: ['id'],
    nullable: true
  }
  assertEquals(schemaToValibot(schema), 'v.nullable(v.object({id: v.string()}))')
})

Deno.test('toValibotValue - optional property (via required flag)', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string' }
  assertEquals(schemaToValibot(schema, false), 'v.optional(v.string())')
})

Deno.test('toValibotValue - optional and nullable', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    nullable: true
  }
  assertEquals(schemaToValibot(schema, false), 'v.optional(v.nullable(v.string()))')
})

Deno.test('toValibotValue - nullable array', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' },
    nullable: true
  }
  assertEquals(schemaToValibot(schema), 'v.nullable(v.array(v.string()))')
})

// ============================================================================
// REFERENCE TESTS
// ============================================================================

Deno.test('toValibotValue - schema reference', () => {
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

  const result = toValibotValue({
    schema: parsedSchema,
    destinationPath: '/test',
    required: true,
    context: toGenerateContext({ oasDocument })
  })

  // ValibotRef instances will have a different string representation
  assertEquals(result.constructor.name, 'ValibotRef')
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

Deno.test('toValibotValue - deeply nested structure', () => {
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
  assertEquals(
    schemaToValibot(schema),
    'v.object({level1: v.object({level2: v.array(v.object({level3: v.object({value: v.string()})}))})})'
  )
})

Deno.test('toValibotValue - additionalProperties with boolean true', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: true
  }
  assertEquals(schemaToValibot(schema), 'v.record(v.string(), v.unknown())')
})

Deno.test('toValibotValue - additionalProperties with empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: {}
  }
  assertEquals(schemaToValibot(schema), 'v.record(v.string(), v.unknown())')
})

Deno.test('toValibotValue - integer with format', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'integer',
    format: 'int32'
  }
  assertEquals(schemaToValibot(schema), 'v.pipe(v.number(), v.integer())')
})

Deno.test('toValibotValue - string with format', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    format: 'date-time'
  }
  assertEquals(schemaToValibot(schema), 'v.pipe(v.string(), v.isoDateTime())')
})

Deno.test('toValibotValue - array with nullable items', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'string',
      nullable: true
    }
  }
  assertEquals(schemaToValibot(schema), 'v.array(v.nullable(v.string()))')
})

Deno.test('toValibotValue - object with all optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      prop1: { type: 'string' },
      prop2: { type: 'number' },
      prop3: { type: 'boolean' }
    }
  }
  assertEquals(
    schemaToValibot(schema),
    'v.object({prop1: v.optional(v.string()), prop2: v.optional(v.number()), prop3: v.optional(v.boolean())})'
  )
})

Deno.test('toValibotValue - union with nullable member', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [{ type: 'string' }, { type: 'number', nullable: true }]
  }
  assertEquals(schemaToValibot(schema), 'v.union([v.string(), v.nullable(v.number())])')
})
