import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TsUnion } from '../../src/TsUnion.ts'
import { toGeneratorOnlyKey, OasString, OasNumber, OasBoolean, OasDiscriminator } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('TsUnion - simple union with two types', () => {
  const tsUnion = new TsUnion({
    context: toGenerateContext(),
    destinationPath: '/test',
    members: [new OasString(), new OasNumber()],
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsUnion.toString(), 'string | number')
})

Deno.test('TsUnion - union with three types', () => {
  const tsUnion = new TsUnion({
    context: toGenerateContext(),
    destinationPath: '/test',
    members: [new OasString(), new OasNumber(), new OasBoolean()],
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsUnion.toString(), 'string | number | boolean')
})

Deno.test('TsUnion - nullable union', () => {
  const tsUnion = new TsUnion({
    context: toGenerateContext(),
    destinationPath: '/test',
    members: [new OasString(), new OasNumber()],
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsUnion.toString(), 'string | number | null')
})

Deno.test('TsUnion - optional union', () => {
  const tsUnion = new TsUnion({
    context: toGenerateContext(),
    destinationPath: '/test',
    members: [new OasString(), new OasNumber()],
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  assertEquals(tsUnion.toString(), '(string | number) | undefined')
})

Deno.test('TsUnion - union with discriminator', () => {
  const tsUnion = new TsUnion({
    context: toGenerateContext(),
    destinationPath: '/test',
    members: [new OasString(), new OasNumber()],
    discriminator: new OasDiscriminator({ propertyName: 'type' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-typescript' })
  })

  // The discriminator is stored but doesn't affect string output in this implementation
  assertEquals(tsUnion.toString(), 'string | number')
  assertEquals(tsUnion.discriminator, 'type')
})
