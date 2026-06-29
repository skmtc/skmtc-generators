import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsString } from '../../src/TsString.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { resetCustomScalars, setCustomScalars } from '../../src/scalars.ts'

Deno.test('TsString - basic string type', () => {
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), 'string')
})

Deno.test('TsString - single enum value', () => {
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['value1'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), "'value1'")
})

Deno.test('TsString - multiple enum values', () => {
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['val1', 'val2', 'val3'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), "'val1' | 'val2' | 'val3'")
})

Deno.test('TsString - nullable string', () => {
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), 'string | null')
})

Deno.test('TsString - optional string', () => {
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), 'string | undefined')
})

Deno.test('TsString - optional and nullable string', () => {
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), '(string | null) | undefined')
})

Deno.test('TsString - with format (should not affect output)', () => {
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'date-time' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), 'string')
})

Deno.test('TsString - unknown format defaults to unknown (custom GraphQL scalar)', () => {
  resetCustomScalars()
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'TotallyMadeUp' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), 'unknown')
})

Deno.test('TsString - configured custom scalar emits the configured TS type', () => {
  resetCustomScalars()
  setCustomScalars({ DateTime: 'string', JSON: 'Record<string, unknown>' })

  const dt = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'DateTime' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })
  assertEquals(dt.toString(), 'string')

  const json = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'JSON' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })
  assertEquals(json.toString(), 'Record<string, unknown>')

  resetCustomScalars()
})

Deno.test('TsString - configured scalar respects nullable modifier', () => {
  resetCustomScalars()
  setCustomScalars({ DateTime: 'Date' })

  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'DateTime' }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), 'Date | null')
  resetCustomScalars()
})

Deno.test('TsString - enum still wins over format mapping', () => {
  resetCustomScalars()
  setCustomScalars({ DateTime: 'Date' })

  // A schema with both enums and a format — enums should take priority.
  const tsString = new TsString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['ADMIN', 'USER'], format: 'DateTime' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsString.toString(), "'ADMIN' | 'USER'")
  resetCustomScalars()
})
