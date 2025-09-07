import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('Reference Type Mappings', () => {
  console.log('\n=== Reference JSON Schema → TypeScript Mappings ===')
  console.log('┌─────────────────────────────────────────────────────┬─────────────────────────┐')
  console.log('│ JSON Schema                                         │ TypeScript Type         │')
  console.log('├─────────────────────────────────────────────────────┼─────────────────────────┤')
  
  const mappings = [
    [createSchema('ref', { $ref: 'User' }), 'User'],
    [createSchema('ref', { $ref: 'Post' }), 'Post'],
    [createSchema('ref', { $ref: 'User', nullable: true }), 'User | null'],
  ] as const

  mappings.forEach(([schema, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required: true,
      context,
    })
    
    const schemaStr = `{"$ref": "${schema.$ref}"}`.padEnd(51)
    const resultStr = result.toString().padEnd(23)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────────────┴─────────────────────────┘\n')
})

Deno.test('Reference Optional/Required Modifiers', () => {
  console.log('\n=== Reference Modifier Mappings ===')
  console.log('┌─────────────────────────────────────────────────────┬─────────────────────────┐')
  console.log('│ JSON Schema (with required flag)                    │ TypeScript Type         │')
  console.log('├─────────────────────────────────────────────────────┼─────────────────────────┤')
  
  const mappings = [
    [createSchema('ref', { $ref: 'User' }), true, 'User'],
    [createSchema('ref', { $ref: 'User' }), false, '(User) | undefined'],
    [createSchema('ref', { $ref: 'User', nullable: true }), true, 'User | null'],
    [createSchema('ref', { $ref: 'User', nullable: true }), false, '(User | null) | undefined'],
  ] as const

  mappings.forEach(([schema, required, expected]) => {
    const context = createMockContext()
    const result = toTsValue({
      schema,
      destinationPath: '/test',
      required,
      context,
    })
    
    const refDisplay = schema.nullable ? `{"$ref": "${schema.$ref}", "nullable": true}` : `{"$ref": "${schema.$ref}"}`
    const schemaStr = `${refDisplay} (req: ${required})`.padEnd(51)
    const resultStr = result.toString().padEnd(23)
    console.log(`│ ${schemaStr} │ ${resultStr} │`)
    
    assertEquals(result.toString(), expected)
  })
  
  console.log('└─────────────────────────────────────────────────────┴─────────────────────────┘\n')
})