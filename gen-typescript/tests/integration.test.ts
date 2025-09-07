import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { TsInsertable } from '../src/TsInsertable.ts'
import { typescriptEntry } from '../src/mod.ts'
import { createMockContext, createSchema } from './test-utils.ts'

Deno.test('Complex Nested Schema Integration', () => {
  console.log('\n=== Complex Schema Integration Test ===')
  console.log('This test demonstrates how complex nested schemas are converted to TypeScript.\n')
  
  const complexSchema = createSchema('object', {
    properties: {
      id: createSchema('string'),
      name: createSchema('string'),
      email: createSchema('string', { nullable: true }),
      age: createSchema('integer'),
      isActive: createSchema('boolean'),
      tags: createSchema('array', {
        items: createSchema('string')
      }),
      metadata: createSchema('object', {
        additionalProperties: createSchema('string')
      }),
      profile: createSchema('object', {
        properties: {
          bio: createSchema('string'),
          avatar: createSchema('string', { nullable: true }),
          preferences: createSchema('object', {
            properties: {
              theme: createSchema('string', { enums: ['light', 'dark'] }),
              notifications: createSchema('boolean')
            },
            required: ['theme']
          })
        },
        required: ['bio']
      }),
      status: createSchema('union', {
        members: [
          createSchema('string', { enums: ['active'] }),
          createSchema('string', { enums: ['inactive'] }),
          createSchema('string', { enums: ['pending'] })
        ]
      })
    },
    required: ['id', 'name', 'age', 'isActive']
  })

  const context = createMockContext()
  const result = toTsValue({
    schema: complexSchema,
    destinationPath: '/test',
    required: true,
    context,
  })

  console.log('Input JSON Schema:')
  console.log(JSON.stringify(complexSchema, null, 2))
  console.log('\n↓ Converts to TypeScript ↓\n')
  console.log('Generated TypeScript Type:')
  console.log(result.toString())
  console.log('\n')

  // Verify the structure contains expected components
  const output = result.toString()
  
  // Check required fields don't have ?
  assertEquals(output.includes('id: string'), true, 'Should have required id field')
  assertEquals(output.includes('name: string'), true, 'Should have required name field')
  assertEquals(output.includes('age: number'), true, 'Should have required age field')
  assertEquals(output.includes('isActive: boolean'), true, 'Should have required isActive field')
  
  // Check optional fields have ?
  assertEquals(output.includes('email?: string | null'), true, 'Should have optional nullable email')
  assertEquals(output.includes('tags?: Array<string>'), true, 'Should have optional tags array')
  
  // Check nested objects and unions
  assertEquals(output.includes("'light' | 'dark'"), true, 'Should have theme enum union')
  assertEquals(output.includes("'active' | 'inactive' | 'pending'"), true, 'Should have status union')
  assertEquals(output.includes('Record<string, string>'), true, 'Should have metadata record')
})

Deno.test('TsInsertable Integration', () => {
  console.log('\n=== TsInsertable Integration Test ===')
  console.log('Testing the complete pipeline through TsInsertable class.\n')

  const schema = createSchema('object', {
    properties: {
      username: createSchema('string'),
      posts: createSchema('array', {
        items: createSchema('ref', { $ref: 'Post' })
      })
    },
    required: ['username']
  })

  const context = createMockContext()
  const settings = {
    identifier: { name: 'User' },
    exportPath: '/types/user.ts'
  }

  const insertable = new TsInsertable({
    context,
    refName: 'User',
    settings,
  })

  console.log('TsInsertable output:')
  console.log(insertable.toString())
  console.log('\n')

  // Verify the insertable generates valid TypeScript
  const output = insertable.toString()
  assertEquals(output.includes('username: string'), true, 'Should have required username')
  assertEquals(output.includes('posts?: Array<Post>'), true, 'Should have optional posts array with Post reference')
})

Deno.test('Entry Point Integration', () => {
  console.log('\n=== Entry Point Integration Test ===')
  console.log('Testing the main typescriptEntry export.\n')

  console.log('TypeScript Entry Configuration:')
  console.log(`ID: ${typescriptEntry.id}`)
  console.log(`Transform Function: ${typeof typescriptEntry.transform}`)
  
  assertEquals(typescriptEntry.id, '@skmtc/gen-typescript', 'Entry should have correct ID')
  assertEquals(typeof typescriptEntry.transform, 'function', 'Entry should have transform function')
  
  console.log('\n✅ Entry point properly configured')
})