import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('Basic Types Mapping', () => {
  console.log('\n=== Basic JSON Schema → TypeScript Mappings ===')
  console.log('┌─────────────────────────────────┬─────────────────────┐')
  console.log('│ JSON Schema                     │ TypeScript Type     │')
  console.log('├─────────────────────────────────┼─────────────────────┤')
  
  const mappings = [
    [createSchema('string'), 'string'],
    [createSchema('number'), 'number'],
    [createSchema('boolean'), 'boolean'],
    [createSchema('integer'), 'number'],
    [createSchema('unknown'), 'unknown'],
    [createSchema('void'), 'void'],
  ] as const

  mappings.forEach(([schema, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required: true,
      context,
    })
    
    const schemaStr = `{"type": "${schema.type}"}`.padEnd(31)
    const resultStr = result.toString().padEnd(19)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────┴─────────────────────┘\n')
})