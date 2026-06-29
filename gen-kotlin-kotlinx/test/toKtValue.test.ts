import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { toSchemaV3, StackTrail } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { toKtValue } from '../src/Kt.ts'
import { toParseContext } from './helpers/toParseContext.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

// Helper to convert a schema and render its Kotlin type expression
function schemaToKt(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required = true
): string {
  const stackTrail = new StackTrail(['TEST'])
  const parsedSchema = toSchemaV3({ schema, context: toParseContext(), stackTrail })

  const result = toKtValue({
    schema: parsedSchema,
    destinationPath: '@/com/example/api/Test.generated.kt',
    required,
    context: toGenerateContext(),
    fallbackName: 'Test'
  })

  return result.toString()
}

Deno.test('toKtValue - string type', () => {
  assertEquals(schemaToKt({ type: 'string' }), 'String')
})

Deno.test('toKtValue - string formats map through the scalar map', () => {
  assertEquals(schemaToKt({ type: 'string', format: 'date-time' }), 'String')
  assertEquals(schemaToKt({ type: 'string', format: 'uuid' }), 'String')
  assertEquals(schemaToKt({ type: 'string', format: 'binary' }), 'ByteArray')
})

Deno.test('toKtValue - integer formats', () => {
  assertEquals(schemaToKt({ type: 'integer' }), 'Int')
  assertEquals(schemaToKt({ type: 'integer', format: 'int32' }), 'Int')
  assertEquals(schemaToKt({ type: 'integer', format: 'int64' }), 'Long')
})

Deno.test('toKtValue - number formats', () => {
  assertEquals(schemaToKt({ type: 'number' }), 'Double')
  assertEquals(schemaToKt({ type: 'number', format: 'float' }), 'Float')
  assertEquals(schemaToKt({ type: 'number', format: 'double' }), 'Double')
})

Deno.test('toKtValue - boolean type', () => {
  assertEquals(schemaToKt({ type: 'boolean' }), 'Boolean')
})

Deno.test('toKtValue - optional renders the nullable suffix', () => {
  assertEquals(schemaToKt({ type: 'string' }, false), 'String?')
  assertEquals(schemaToKt({ type: 'integer', format: 'int64' }, false), 'Long?')
})

Deno.test('toKtValue - nullable renders the nullable suffix (no doubling when also optional)', () => {
  assertEquals(schemaToKt({ type: 'string', nullable: true }), 'String?')
  assertEquals(schemaToKt({ type: 'string', nullable: true }, false), 'String?')
})

Deno.test('toKtValue - arrays render List<T>', () => {
  assertEquals(schemaToKt({ type: 'array', items: { type: 'string' } }), 'List<String>')
  assertEquals(
    schemaToKt({ type: 'array', items: { type: 'array', items: { type: 'integer' } } }),
    'List<List<Int>>'
  )
  assertEquals(schemaToKt({ type: 'array', items: { type: 'string' } }, false), 'List<String>?')
})

Deno.test('toKtValue - additionalProperties-only objects render Map<String, T>', () => {
  assertEquals(
    schemaToKt({ type: 'object', additionalProperties: { type: 'string' } }),
    'Map<String, String>'
  )
  assertEquals(schemaToKt({ type: 'object', additionalProperties: true }), 'Map<String, JsonElement>')
})

Deno.test('toKtValue - empty objects render JsonObject', () => {
  assertEquals(schemaToKt({ type: 'object' }), 'JsonObject')
})

Deno.test('toKtValue - oneOf renders the JsonElement fallback', () => {
  assertEquals(
    schemaToKt({ oneOf: [{ type: 'string' }, { type: 'integer' }] }),
    'JsonElement'
  )
})

Deno.test('toKtValue - inline objects with properties synthesize a named data class', () => {
  const stackTrail = new StackTrail(['TEST'])
  const schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: { street: { type: 'string' } },
    required: ['street']
  }
  const parsedSchema = toSchemaV3({ schema, context: toParseContext(), stackTrail })
  const context = toGenerateContext()

  const result = toKtValue({
    schema: parsedSchema,
    destinationPath: '@/com/example/api/Test.generated.kt',
    required: true,
    context,
    fallbackName: 'TestAddress'
  })

  assertEquals(result.toString(), 'TestAddress')

  const file = context.getFile('@/com/example/api/Test.generated.kt')
  assertEquals(
    file?.toString(),
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      'data class TestAddress(\n' +
      '    val street: String\n' +
      ')\n'
  )
})

Deno.test('toKtValue - inline string enums synthesize a named enum class', () => {
  const stackTrail = new StackTrail(['TEST'])
  const schema: OpenAPIV3.SchemaObject = { type: 'string', enum: ['active', 'in-progress'] }
  const parsedSchema = toSchemaV3({ schema, context: toParseContext(), stackTrail })
  const context = toGenerateContext()

  const result = toKtValue({
    schema: parsedSchema,
    destinationPath: '@/com/example/api/Test.generated.kt',
    required: true,
    context,
    fallbackName: 'TestStatus'
  })

  assertEquals(result.toString(), 'TestStatus')

  const file = context.getFile('@/com/example/api/Test.generated.kt')
  assertEquals(
    file?.toString(),
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.SerialName\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      'enum class TestStatus {\n' +
      '    @SerialName("active") ACTIVE,\n' +
      '    @SerialName("in-progress") IN_PROGRESS\n' +
      '}\n'
  )
})
