import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { TsVoid } from '../src/TsVoid.ts'
import { TsUnknown } from '../src/TsUnknown.ts'
import { TsNever } from '../src/TsNever.ts'
import { TsNull } from '../src/TsNull.ts'
import { createMockContext } from './test-utils.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { typescriptEntry } from '../src/mod.ts'

Deno.test('Utility Type Mappings', () => {
  console.log('\n=== Utility TypeScript Type Mappings ===')
  console.log('┌─────────────────────────┬─────────────────────┐')
  console.log('│ Type Class              │ TypeScript Output   │')
  console.log('├─────────────────────────┼─────────────────────┤')
  
  const context = createMockContext()
  const generatorKey = toGeneratorOnlyKey({ generatorId: typescriptEntry.id })
  
  const types = [
    ['TsVoid', new TsVoid({ context, generatorKey }), 'void'],
    ['TsUnknown', new TsUnknown({ context, generatorKey }), 'unknown'],
    ['TsNever', new TsNever({ context, generatorKey }), 'never'],
    ['TsNull', new TsNull({ context, generatorKey }), 'null'],
  ] as const

  types.forEach(([className, instance, expected]) => {
    const classStr = className.padEnd(23)
    const resultStr = instance.toString().padEnd(19)
    console.log(`│ ${classStr} │ ${resultStr} │`)
    
    assertEquals(instance.toString(), expected)
  })
  
  console.log('└─────────────────────────┴─────────────────────┘\n')
})

Deno.test('Utility Type Properties', () => {
  console.log('\n=== Utility Type Properties ===')
  console.log('┌─────────────────────────┬─────────────────────┐')
  console.log('│ Type Class              │ Type Property       │')
  console.log('├─────────────────────────┼─────────────────────┤')
  
  const context = createMockContext()
  const generatorKey = toGeneratorOnlyKey({ generatorId: typescriptEntry.id })
  
  const types = [
    ['TsVoid', new TsVoid({ context, generatorKey }), 'void'],
    ['TsUnknown', new TsUnknown({ context, generatorKey }), 'unknown'],
    ['TsNever', new TsNever({ context, generatorKey }), 'never'],
    ['TsNull', new TsNull({ context, generatorKey }), 'null'],
  ] as const

  types.forEach(([className, instance, expectedType]) => {
    const classStr = className.padEnd(23)
    const typeStr = instance.type.padEnd(19)
    console.log(`│ ${classStr} │ ${typeStr} │`)
    
    assertEquals(instance.type, expectedType)
  })
  
  console.log('└─────────────────────────┴─────────────────────┘\n')
})