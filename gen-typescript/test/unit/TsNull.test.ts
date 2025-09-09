import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsNull } from '../../src/TsNull.ts'

// Mock context for unit tests
const mockContext = {
  trace: (_name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsNull - basic null type', () => {
  const tsNull = new TsNull({
    context: mockContext,
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsNull.toString(), 'null')
})