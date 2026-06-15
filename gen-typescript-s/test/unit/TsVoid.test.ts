import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsVoid } from '../../src/TsVoid.ts'

// Mock context for unit tests
const mockContext = {
  trace: (_name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsVoid - basic void type', () => {
  const tsVoid = new TsVoid({
    context: mockContext,
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsVoid.toString(), 'void')
})