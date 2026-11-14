import { assertEquals } from '@std/assert'
import { ValibotBoolean } from '../../src/ValibotBoolean.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { OasBoolean, toGeneratorOnlyKey } from '@skmtc/core'

Deno.test('ValibotBoolean - basic boolean type', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.boolean()')
})

Deno.test('ValibotBoolean - nullable boolean', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.nullable(v.boolean())')
})

Deno.test('ValibotBoolean - optional boolean', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.optional(v.boolean())')
})

Deno.test('ValibotBoolean - optional and nullable boolean', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotBoolean.toString(), 'v.optional(v.nullable(v.boolean()))')
})

// gen-typescript types `enum: [true]` as `true`; a recursive model's
// `v.GenericSchema<T>` annotation fails against a wider `v.boolean()`
// (Stripe's `deleted_customer.deleted`).
Deno.test('ValibotBoolean - a single-value enum is its literal', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test',
    schema: new OasBoolean({ enums: [true] })
  })

  assertEquals(valibotBoolean.toString(), 'v.literal(true)')
})

Deno.test('ValibotBoolean - both values say no more than a boolean', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test',
    schema: new OasBoolean({ enums: [true, false] })
  })

  assertEquals(valibotBoolean.toString(), 'v.boolean()')
})

Deno.test('ValibotBoolean - a null among the values leaves it to the nullable modifier', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test',
    schema: new OasBoolean({ nullable: true, enums: [true, null] })
  })

  assertEquals(valibotBoolean.toString(), 'v.nullable(v.literal(true))')
})

Deno.test('ValibotBoolean - an enum of null alone is null', () => {
  const valibotBoolean = new ValibotBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test',
    schema: new OasBoolean({ nullable: true, enums: [null] })
  })

  assertEquals(valibotBoolean.toString(), 'v.nullable(v.null())')
})
