import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsString } from '../../src/TsString.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'

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
