import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('String Type Variations', () => {
  console.log('\n=== String JSON Schema → TypeScript Mappings ===')
  console.log('┌─────────────────────────────────────────────┬─────────────────────┐')
  console.log('│ JSON Schema                                 │ TypeScript Type     │')
  console.log('├─────────────────────────────────────────────┼─────────────────────┤')
  
  const mappings = [
    [createSchema('string', { enums: ['a'] }), "'a'"],
    [createSchema('string', { enums: ['a', 'b'] }), "'a' | 'b'"],
    [createSchema('string', { enums: ['hello', 'world'] }), "'hello' | 'world'"],
    [createSchema('string', { nullable: true }), 'string | null'],
    [createSchema('string', { format: 'email' }), 'string'],
    [createSchema('string', { format: 'date-time' }), 'string'],
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
      ? `{"type": "string", "enum": [${schema.enums.map(e => `"${e}"`).join(', ')}]}`
      : schema.nullable 
      ? '{"type": "string", "nullable": true}'
      : schema.format
      ? `{"type": "string", "format": "${schema.format}"}`
      : '{"type": "string"}'
    
    const schemaStr = schemaDisplay.padEnd(43)
    const resultStr = result.toString().padEnd(19)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────┴─────────────────────┘\n')
})

Deno.test('String Optional/Required Modifiers', () => {
  console.log('\n=== String Modifier Mappings ===')
  console.log('┌─────────────────────────────────────────────┬─────────────────────────┐')
  console.log('│ JSON Schema (with required flag)            │ TypeScript Type         │')
  console.log('├─────────────────────────────────────────────┼─────────────────────────┤')
  
  const mappings = [
    [createSchema('string'), true, 'string'],
    [createSchema('string'), false, '(string) | undefined'],
    [createSchema('string', { nullable: true }), true, 'string | null'],
    [createSchema('string', { nullable: true }), false, '(string | null) | undefined'],
  ] as const

  mappings.forEach(([schema, required, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required,
      context,
    })
    
    const schemaDisplay = schema.nullable ? '{"type": "string", "nullable": true}' : '{"type": "string"}'
    const schemaStr = `${schemaDisplay} (req: ${required})`.padEnd(43)
    const resultStr = result.toString().padEnd(23)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────┴─────────────────────────┘\n')
})