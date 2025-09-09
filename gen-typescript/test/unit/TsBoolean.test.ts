import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsBoolean } from '../../src/TsBoolean.ts'

// Mock context for unit tests
const mockContext = {
  trace: (name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsBoolean - basic boolean type', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: true },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsBoolean.toString(), 'boolean')
})

Deno.test('TsBoolean - nullable boolean', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: true, nullable: true },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsBoolean.toString(), 'boolean | null')
})

Deno.test('TsBoolean - optional boolean', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: false },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsBoolean.toString(), 'boolean | undefined')
})

Deno.test('TsBoolean - optional and nullable boolean', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: false, nullable: true },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsBoolean.toString(), '(boolean | null) | undefined')
})