import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsUnknown } from '../../src/TsUnknown.ts'

// Mock context for unit tests
const mockContext = {
  trace: (_name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsUnknown - basic unknown type', () => {
  const tsUnknown = new TsUnknown({
    context: mockContext,
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsUnknown.toString(), 'unknown')
})