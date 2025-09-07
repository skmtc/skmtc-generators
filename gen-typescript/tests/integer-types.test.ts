import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('Integer Type Variations', () => {
  console.log('\n=== Integer JSON Schema → TypeScript Mappings ===')
  console.log('┌─────────────────────────────────────────────┬─────────────────────┐')
  console.log('│ JSON Schema                                 │ TypeScript Type     │')
  console.log('├─────────────────────────────────────────────┼─────────────────────┤')
  
  const mappings = [
    [createSchema('integer'), 'number'],
    [createSchema('integer', { format: 'int32' }), 'number'],
    [createSchema('integer', { format: 'int64' }), 'number'],
    [createSchema('integer', { enums: [1] }), '1'],
    [createSchema('integer', { enums: [1, 2, 3] }), '1 | 2 | 3'],
    [createSchema('integer', { enums: [0, null] }), '0 | null'],
  ] as const

  mappings.forEach(([schema, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required: true,
      context,
    })
    
    const schemaDisplay = schema.enums 
      ? `{"type": "integer", "enum": [${schema.enums.join(', ')}]}` 
      : schema.format
      ? `{"type": "integer", "format": "${schema.format}"}`
      : '{"type": "integer"}'
    const schemaStr = schemaDisplay.padEnd(43)
    const resultStr = result.toString().padEnd(19)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────┴─────────────────────┘\n')
})