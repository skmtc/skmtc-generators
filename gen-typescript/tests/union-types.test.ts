import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('Union Type Mappings', () => {
  console.log('\n=== Union JSON Schema → TypeScript Mappings ===')
  console.log('┌─────────────────────────────────────────────────────────────────────┬─────────────────────────┐')
  console.log('│ JSON Schema                                                         │ TypeScript Type         │')
  console.log('├─────────────────────────────────────────────────────────────────────┼─────────────────────────┤')
  
  const mappings = [
    [
      createSchema('union', {
        members: [createSchema('string'), createSchema('number')] 
      }), 
      'string | number'
    ],
    [
      createSchema('union', {
        members: [
          createSchema('string'), 
          createSchema('number'), 
          createSchema('boolean')
        ] 
      }), 
      'string | number | boolean'
    ],
    [
      createSchema('union', {
        members: [
          createSchema('string', { enums: ['a'] }), 
          createSchema('number')
        ] 
      }), 
      "'a' | number"
    ],
    [
      createSchema('union', {
        members: [
          createSchema('object', { properties: { type: createSchema('string', { enums: ['user'] }) } }), 
          createSchema('object', { properties: { type: createSchema('string', { enums: ['admin'] }) } })
        ] 
      }), 
      "{type?: 'user'} | {type?: 'admin'}"
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
    
    const schemaStr = `union of ${schema.members?.length || 0} types`.padEnd(67)
    const resultStr = result.toString().padEnd(23)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────────────────────────────┴─────────────────────────┘\n')
})

Deno.test('Discriminated Union Type', () => {
  console.log('\n=== Discriminated Union Mappings ===')
  console.log('┌─────────────────────────────────────────────────────────────────────┬─────────────────────────┐')
  console.log('│ JSON Schema                                                         │ TypeScript Type         │')
  console.log('├─────────────────────────────────────────────────────────────────────┼─────────────────────────┤')
  
  const schema = createSchema('union', {
    discriminator: { propertyName: 'type' },
    members: [
      createSchema('object', { 
        properties: { 
          type: createSchema('string', { enums: ['circle'] }),
          radius: createSchema('number')
        },
        required: ['type', 'radius']
      }), 
      createSchema('object', { 
        properties: { 
          type: createSchema('string', { enums: ['square'] }),
          size: createSchema('number')
        },
        required: ['type', 'size']
      })
    ]
  })
  
  const context = createMockContext()
  const result = toTsValue({
    schema,
    destinationPath: '/test',
    required: true,
    context,
  })
  
  const schemaStr = 'discriminated union with type property'.padEnd(67)
  const resultStr = result.toString().padEnd(23)
  console.log(`│ ${schemaStr} │ ${resultStr} │`)
  
  const expected = "{type: 'circle', radius: number} | {type: 'square', size: number}"
  assertEquals(result.toString(), expected)
  
  console.log('└─────────────────────────────────────────────────────────────────────┴─────────────────────────┘\n')
})