import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsArray } from '../../src/TsArray.ts'
import { toGeneratorOnlyKey, OasNumber, OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('TsArray - array of strings', () => {
  const tsArray = new TsArray({
    context: toGenerateContext(),
    destinationPath: '/test',
    items: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsArray.toString(), 'Array<string>')
})

Deno.test('TsArray - nullable array', () => {
  const tsArray = new TsArray({
    context: toGenerateContext(),
    destinationPath: '/test',
    items: new OasNumber(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsArray.toString(), 'Array<number> | null')
})

Deno.test('TsArray - optional array', () => {
  const tsArray = new TsArray({
    context: toGenerateContext(),
    destinationPath: '/test',
    items: new OasString(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsArray.toString(), 'Array<string> | undefined')
})
