import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { toSchemaV3, StackTrail } from '@skmtc/core'
import { toZodValue } from '../src/Zod.ts'
import type { OpenAPIV3 } from 'openapi-types'
import { toParseContext } from './helpers/toParseContext.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

// Helper to convert schema and get Zod string
function schemaToZod(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required = true
): string {
  const stackTrail = new StackTrail(['TEST'])
  const parsedSchema = toSchemaV3({ schema, context: toParseContext(), stackTrail })

  const result = toZodValue({
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

Deno.test('toZodValue - string type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string' }
  assertEquals(schemaToZod(schema), 'z.string()')
})

Deno.test('toZodValue - number type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'number' }
  assertEquals(schemaToZod(schema), 'z.number()')
})

Deno.test('toZodValue - integer type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'integer' }
  assertEquals(schemaToZod(schema), 'z.number().int()')
})

Deno.test('toZodValue - boolean type', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'boolean' }
  assertEquals(schemaToZod(schema), 'z.boolean()')
})

// ============================================================================
// STRING ENUM/LITERAL TESTS
// ============================================================================

Deno.test('toZodValue - string with single enum value', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['value1']
  }
  assertEquals(schemaToZod(schema), 'z.literal("value1")')
})

Deno.test('toZodValue - string with multiple enum values', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['value1', 'value2', 'value3']
  }
  assertEquals(schemaToZod(schema), 'z.enum(["value1", "value2", "value3"])')
})

// ============================================================================
// ARRAY TYPE TESTS
// ============================================================================

Deno.test('toZodValue - array of strings', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' }
  }
  assertEquals(schemaToZod(schema), 'z.array(z.string())')
})

Deno.test('toZodValue - array of numbers', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'number' }
  }
  assertEquals(schemaToZod(schema), 'z.array(z.number())')
})

Deno.test('toZodValue - nested arrays', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' }
    }
  }
  assertEquals(schemaToZod(schema), 'z.array(z.array(z.number()))')
})

Deno.test('toZodValue - array of objects', () => {
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
  assertEquals(schemaToZod(schema), 'z.array(z.object({id: z.string()}))')
})

// ============================================================================
// OBJECT TYPE TESTS
// ============================================================================

Deno.test('toZodValue - simple object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name', 'age']
  }
  assertEquals(schemaToZod(schema), 'z.object({name: z.string(), age: z.number()})')
})

Deno.test('toZodValue - object with optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  }
  assertEquals(schemaToZod(schema), 'z.object({name: z.string(), age: z.number().optional()})')
})

Deno.test('toZodValue - empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object'
  }
  assertEquals(schemaToZod(schema), 'z.object({})')
})

Deno.test('toZodValue - object with additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: { type: 'string' }
  }
  assertEquals(schemaToZod(schema), 'z.record(z.string(), z.string())')
})

Deno.test('toZodValue - object with properties and additionalProperties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: { type: 'string' }
    },
    required: ['id'],
    additionalProperties: { type: 'number' }
  }
  assertEquals(
    schemaToZod(schema),
    'z.object({id: z.string()}).and(z.record(z.string(), z.number()))'
  )
})

Deno.test('toZodValue - nested object', () => {
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
    schemaToZod(schema),
    'z.object({user: z.object({id: z.string(), profile: z.object({name: z.string()})})})'
  )
})

Deno.test.ignore('toZodValue - object with special characters in keys', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      'special-key': { type: 'string' },
      'another.key': { type: 'number' }
    },
    required: ['special-key', 'another.key']
  }
  assertEquals(
    schemaToZod(schema),
    'z.object({"special-key": z.string(), "another.key": z.number()})'
  )
})

// ============================================================================
// UNION TYPE TESTS
// ============================================================================

Deno.test('toZodValue - simple union (oneOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [{ type: 'string' }, { type: 'number' }]
  }
  assertEquals(schemaToZod(schema), 'z.union([z.string(), z.number()])')
})

Deno.test('toZodValue - simple union (anyOf)', () => {
  const schema: OpenAPIV3.SchemaObject = {
    anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }]
  }
  assertEquals(schemaToZod(schema), 'z.union([z.string(), z.number(), z.boolean()])')
})

Deno.test('toZodValue - union with objects', () => {
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
    schemaToZod(schema),
    'z.union([z.object({type: z.literal("cat"), meow: z.boolean()}), z.object({type: z.literal("dog"), bark: z.boolean()})])'
  )
})

// ============================================================================
// MODIFIER TESTS
// ============================================================================

Deno.test('toZodValue - nullable string', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    nullable: true
  }
  assertEquals(schemaToZod(schema), 'z.string().nullable()')
})

Deno.test('toZodValue - nullable object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: { type: 'string' }
    },
    required: ['id'],
    nullable: true
  }
  assertEquals(schemaToZod(schema), 'z.object({id: z.string()}).nullable()')
})

Deno.test('toZodValue - optional property (via required flag)', () => {
  const schema: OpenAPIV3.SchemaObject = { type: 'string' }
  assertEquals(schemaToZod(schema, false), 'z.string().optional()')
})

Deno.test('toZodValue - optional and nullable', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'string',
    nullable: true
  }
  assertEquals(schemaToZod(schema, false), 'z.string().nullable().optional()')
})

Deno.test('toZodValue - nullable array', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'string' },
    nullable: true
  }
  assertEquals(schemaToZod(schema), 'z.array(z.string()).nullable()')
})

// ============================================================================
// REFERENCE TESTS
// ============================================================================

Deno.test('toZodValue - schema reference', () => {
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

  const result = toZodValue({
    schema: parsedSchema,
    destinationPath: '/test',
    required: true,
    context: toGenerateContext({ oasDocument })
  })

  // ZodRef instances will have a different string representation
  assertEquals(result.constructor.name, 'ZodRef')
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

Deno.test('toZodValue - deeply nested structure', () => {
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
    schemaToZod(schema),
    'z.object({level1: z.object({level2: z.array(z.object({level3: z.object({value: z.string()})}))})})'
  )
})

Deno.test('toZodValue - additionalProperties with boolean true', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: true
  }
  assertEquals(schemaToZod(schema), 'z.record(z.string(), z.unknown())')
})

Deno.test('toZodValue - additionalProperties with empty object', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    additionalProperties: {}
  }
  assertEquals(schemaToZod(schema), 'z.record(z.string(), z.unknown())')
})

Deno.test('toZodValue - integer with format', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'integer',
    format: 'int32'
  }
  assertEquals(schemaToZod(schema), 'z.number().int()')
})

// Deno.test('toZodValue - string with format', () => {
//   const schema: OpenAPIV3.SchemaObject = {
//     type: 'string',
//     format: 'date-time'
//   }
//   assertEquals(schemaToZod(schema), 'z.string().datetime()')
// })

Deno.test('toZodValue - array with nullable items', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: {
      type: 'string',
      nullable: true
    }
  }
  assertEquals(schemaToZod(schema), 'z.array(z.string().nullable())')
})

Deno.test('toZodValue - object with all optional properties', () => {
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      prop1: { type: 'string' },
      prop2: { type: 'number' },
      prop3: { type: 'boolean' }
    }
  }
  assertEquals(
    schemaToZod(schema),
    'z.object({prop1: z.string().optional(), prop2: z.number().optional(), prop3: z.boolean().optional()})'
  )
})

Deno.test('toZodValue - union with nullable member', () => {
  const schema: OpenAPIV3.SchemaObject = {
    oneOf: [{ type: 'string' }, { type: 'number', nullable: true }]
  }
  assertEquals(schemaToZod(schema), 'z.union([z.string(), z.number().nullable()])')
})
