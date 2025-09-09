import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsNumber } from '../../src/TsNumber.ts'

// Mock context for unit tests
const mockContext = {
  trace: (name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsNumber - basic number type', () => {
  const tsNumber = new TsNumber({
    context: mockContext,
    modifiers: { required: true },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsNumber.toString(), 'number')
})

Deno.test('TsNumber - nullable number', () => {
  const tsNumber = new TsNumber({
    context: mockContext,
    modifiers: { required: true, nullable: true },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsNumber.toString(), 'number | null')
})

Deno.test('TsNumber - optional number', () => {
  const tsNumber = new TsNumber({
    context: mockContext,
    modifiers: { required: false },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsNumber.toString(), 'number | undefined')
})

Deno.test('TsNumber - optional and nullable number', () => {
  const tsNumber = new TsNumber({
    context: mockContext,
    modifiers: { required: false, nullable: true },
    generatorKey: mockGeneratorKey
  })
  
  assertEquals(tsNumber.toString(), '(number | null) | undefined')
})