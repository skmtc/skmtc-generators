import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsNever } from '../../src/TsNever.ts'

// Mock context for unit tests
const mockContext = {
  trace: (_name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsNever - basic never type', () => {
  const tsNever = new TsNever({
    context: mockContext,
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsNever.toString(), 'never')
})