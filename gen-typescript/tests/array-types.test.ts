import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('Array Type Mappings', () => {
  console.log('\n=== Array JSON Schema → TypeScript Mappings ===')
  console.log('┌─────────────────────────────────────────────────────┬─────────────────────┐')
  console.log('│ JSON Schema                                         │ TypeScript Type     │')
  console.log('├─────────────────────────────────────────────────────┼─────────────────────┤')
  
  const mappings = [
    [createSchema('array', { items: createSchema('string') }), 'Array<string>'],
    [createSchema('array', { items: createSchema('number') }), 'Array<number>'],
    [createSchema('array', { items: createSchema('boolean') }), 'Array<boolean>'],
    [createSchema('array', { items: createSchema('unknown') }), 'Array<unknown>'],
    [createSchema('array', { items: createSchema('string', { enums: ['a', 'b'] }) }), "Array<'a' | 'b'>"],
  ] as const

  mappings.forEach(([schema, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required: true,
      context,
    })
    
    const itemsDisplay = schema.items?.enums 
      ? `{"type": "${schema.items.type}", "enum": [${schema.items.enums.map((e: any) => `"${e}"`).join(', ')}]}`
      : `{"type": "${schema.items?.type || 'unknown'}"}`
    const schemaDisplay = `{"type": "array", "items": ${itemsDisplay}}`
    const schemaStr = schemaDisplay.padEnd(51)
    const resultStr = result.toString().padEnd(19)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────────────┴─────────────────────┘\n')
})

Deno.test('Array Modifier Mappings', () => {
  console.log('\n=== Array Modifier Mappings ===')
  console.log('┌─────────────────────────────────────────────────────┬─────────────────────────┐')
  console.log('│ JSON Schema (with required flag)                    │ TypeScript Type         │')
  console.log('├─────────────────────────────────────────────────────┼─────────────────────────┤')
  
  const mappings = [
    [createSchema('array', { items: createSchema('string') }), true, 'Array<string>'],
    [createSchema('array', { items: createSchema('string') }), false, '(Array<string>) | undefined'],
    [createSchema('array', { items: createSchema('string'), nullable: true }), true, 'Array<string> | null'],
    [createSchema('array', { items: createSchema('string'), nullable: true }), false, '(Array<string> | null) | undefined'],
  ] as const

  mappings.forEach(([schema, required, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required,
      context,
    })
    
    const schemaDisplay = schema.nullable 
      ? `{"type": "array", "items": {"type": "string"}, "nullable": true}`
      : `{"type": "array", "items": {"type": "string"}}`
    const schemaStr = `${schemaDisplay} (req: ${required})`.padEnd(51)
    const resultStr = result.toString().padEnd(23)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────────────┴─────────────────────────┘\n')
})