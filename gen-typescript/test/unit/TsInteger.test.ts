import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsInteger } from '../../src/TsInteger.ts'
import { OasInteger } from '@skmtc/core'

// Mock context for unit tests
const mockContext = {
  trace: (_name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsInteger - basic integer type', () => {
  const tsInteger = new TsInteger({
    context: mockContext,
    integerSchema: new OasInteger(),
    modifiers: { required: true },
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsInteger.toString(), 'number')
})

Deno.test('TsInteger - with format', () => {
  const tsInteger = new TsInteger({
    context: mockContext,
    integerSchema: new OasInteger({ format: 'int32' }),
    modifiers: { required: true },
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsInteger.toString(), 'number')
})

Deno.test('TsInteger - nullable integer', () => {
  const tsInteger = new TsInteger({
    context: mockContext,
    integerSchema: new OasInteger(),
    modifiers: { required: true, nullable: true },
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsInteger.toString(), 'number | null')
})

Deno.test('TsInteger - optional integer', () => {
  const tsInteger = new TsInteger({
    context: mockContext,
    integerSchema: new OasInteger(),
    modifiers: { required: false },
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsInteger.toString(), 'number | undefined')
})
