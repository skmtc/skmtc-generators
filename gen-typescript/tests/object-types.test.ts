import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('Object Type Mappings', () => {
  console.log('\n=== Object JSON Schema → TypeScript Mappings ===')
  console.log('┌─────────────────────────────────────────────────────────────────────┬─────────────────────────┐')
  console.log('│ JSON Schema                                                         │ TypeScript Type         │')
  console.log('├─────────────────────────────────────────────────────────────────────┼─────────────────────────┤')
  
  const mappings = [
    [createSchema('object', { properties: {} }), 'Record<string, never>'],
    [createSchema('object', { additionalProperties: createSchema('string') }), 'Record<string, string>'],
    [createSchema('object', { additionalProperties: createSchema('number') }), 'Record<string, number>'],
    [createSchema('object', { additionalProperties: true }), 'Record<string, unknown>'],
    [
      createSchema('object', { 
        properties: { name: createSchema('string') } 
      }), 
      '{name?: string}'
    ],
    [
      createSchema('object', { 
        properties: { name: createSchema('string') }, 
        required: ['name'] 
      }), 
      '{name: string}'
    ],
    [
      createSchema('object', { 
        properties: { 
          name: createSchema('string'), 
          age: createSchema('number') 
        },
        required: ['name']
      }), 
      '{name: string, age?: number}'
    ],
  ] as const

  mappings.forEach(([schema, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required: true,
      context,
    })
    
    const schemaDisplay = schema.properties && Object.keys(schema.properties).length > 0
      ? `object with properties`
      : schema.additionalProperties === true
      ? 'object with additionalProperties: true'
      : schema.additionalProperties
      ? `object with additionalProperties: ${schema.additionalProperties.type}`
      : 'empty object'
    const schemaStr = schemaDisplay.padEnd(67)
    const resultStr = result.toString().padEnd(23)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────────────────────────────┴─────────────────────────┘\n')
})

Deno.test('Object with Record and Properties', () => {
  console.log('\n=== Mixed Object + Record Mappings ===')
  console.log('┌─────────────────────────────────────────────────────────────────────┬───────────────────────────────────┐')
  console.log('│ JSON Schema                                                         │ TypeScript Type                   │')
  console.log('├─────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤')
  
  const schema = createSchema('object', {
    properties: { id: createSchema('string') },
    required: ['id'],
    additionalProperties: createSchema('number')
  })
  
  const context = createMockContext()
  const result = toTsValue({
    schema,
    destinationPath: '/test',
    required: true,
    context,
  })
  
  const schemaStr = 'object with properties + additionalProperties'.padEnd(67)
  const resultStr = result.toString().padEnd(33)
  console.log(`│ ${schemaStr} │ ${resultStr} │`)
  
  assertEquals(result.toString(), '{id: string} | Record<string, number>')
  
  console.log('└─────────────────────────────────────────────────────────────────────┴───────────────────────────────────┘\n')
})