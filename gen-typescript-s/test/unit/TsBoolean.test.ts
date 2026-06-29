import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsBoolean } from '../../src/TsBoolean.ts'
import { OasBoolean } from '@skmtc/core'

// Mock context for unit tests
// deno-lint-ignore no-explicit-any
const mockContext = {
  trace: (_name: string, fn: () => any) => fn(),
  stackTrail: { slice: () => '' }
} as any

// deno-lint-ignore no-explicit-any
const mockGeneratorKey = { generatorId: '@skmtc/gen-typescript', type: 'generator' } as any

Deno.test('TsBoolean - basic boolean type', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: true },
    booleanSchema: new OasBoolean(),
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsBoolean.toString(), 'boolean')
})

Deno.test('TsBoolean - nullable boolean', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: true, nullable: true },
    booleanSchema: new OasBoolean(),
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsBoolean.toString(), 'boolean | null')
})

Deno.test('TsBoolean - optional boolean', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: false },
    booleanSchema: new OasBoolean(),
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsBoolean.toString(), 'boolean | undefined')
})

Deno.test('TsBoolean - optional and nullable boolean', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: false, nullable: true },
    booleanSchema: new OasBoolean(),
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsBoolean.toString(), '(boolean | null) | undefined')
})

Deno.test('TsBoolean - single-value enum [true] emits TS literal type `true`', () => {
  // Closes the boolean half of friction #17 on the TypeScript side.
  // Hand-written discriminated unions use literal-boolean tag
  // properties (`isLocked: true | false`) to drive narrowing —
  // emitting plain `boolean` erases the discriminator.
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: true },
    booleanSchema: new OasBoolean({ enums: [true] }),
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsBoolean.toString(), 'true')
})

Deno.test('TsBoolean - single-value enum [false] emits TS literal type `false`', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: true },
    booleanSchema: new OasBoolean({ enums: [false] }),
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsBoolean.toString(), 'false')
})

Deno.test(
  'TsBoolean - multi-value enum [true, false] falls back to `boolean`',
  () => {
    // Both-values enum carries no extra info vs an unconstrained
    // boolean. Falling through to `boolean` reads cleaner than the
    // structurally-identical `true | false`.
    const tsBoolean = new TsBoolean({
      context: mockContext,
      modifiers: { required: true },
      booleanSchema: new OasBoolean({ enums: [true, false] }),
      generatorKey: mockGeneratorKey
    })

    assertEquals(tsBoolean.toString(), 'boolean')
  }
)

Deno.test('TsBoolean - literal enum composes with nullable/optional', () => {
  const tsBoolean = new TsBoolean({
    context: mockContext,
    modifiers: { required: false, nullable: true },
    booleanSchema: new OasBoolean({ enums: [true] }),
    generatorKey: mockGeneratorKey
  })

  assertEquals(tsBoolean.toString(), '(true | null) | undefined')
})
