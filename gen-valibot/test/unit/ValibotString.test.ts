import { assertEquals } from '@std/assert'
import { ValibotString } from '../../src/ValibotString.ts'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import type { Modifiers } from '@skmtc/core'
import { formatActions } from '../../src/formats.ts'

Deno.test('ValibotString - basic string type', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.string()')
})

Deno.test('ValibotString - single enum value', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['value1'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), "v.literal('value1')")
})

Deno.test('ValibotString - multiple enum values', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['val1', 'val2', 'val3'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), "v.picklist(['val1', 'val2', 'val3'])")
})

Deno.test('ValibotString - nullable string', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.nullable(v.string())')
})

Deno.test('ValibotString - optional string', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.optional(v.string())')
})

Deno.test('ValibotString - optional and nullable string', () => {
  const valibotString = new ValibotString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

  assertEquals(valibotString.toString(), 'v.optional(v.nullable(v.string()))')
})

const toValibotString = (stringSchema: OasString, modifiers: Modifiers = { required: true }) =>
  new ValibotString({
    context: toGenerateContext(),
    stringSchema,
    modifiers,
    generatorKey: toGeneratorOnlyKey({ generatorId: '@skmtc/gen-valibot' }),
    destinationPath: '/test'
  })

// Written out, not read from `formatActions`, so a wrong entry there fails.
const mappedFormats: Array<[string, string]> = [
  // The trap: v.isoDateTime() takes no seconds and no offset, so it refuses
  // every RFC 3339 date-time.
  ['date-time', 'v.pipe(v.string(), v.isoTimestamp())'],
  ['date', 'v.pipe(v.string(), v.isoDate())'],
  ['email', 'v.pipe(v.string(), v.email())'],
  ['uri', 'v.pipe(v.string(), v.url())'],
  ['uuid', 'v.pipe(v.string(), v.uuid())'],
  ['ipv4', 'v.pipe(v.string(), v.ipv4())'],
  ['ipv6', 'v.pipe(v.string(), v.ipv6())']
]

for (const [format, expected] of mappedFormats) {
  Deno.test(`ValibotString - format ${format} renders ${expected}`, () => {
    assertEquals(toValibotString(new OasString({ format })).toString(), expected)
  })
}

Deno.test('ValibotString - every format in formatActions has a test', () => {
  assertEquals([...formatActions.keys()].sort(), mappedFormats.map(([format]) => format).sort())
})

Deno.test('ValibotString - a format valibot has no action for stays v.string()', () => {
  assertEquals(toValibotString(new OasString({ format: 'duration' })).toString(), 'v.string()')
  assertEquals(toValibotString(new OasString({ format: 'uri-template' })).toString(), 'v.string()')
})

// The trap: a format name such as `constructor` is a key of every object.
Deno.test('ValibotString - a format named after an Object.prototype key stays v.string()', () => {
  assertEquals(toValibotString(new OasString({ format: 'constructor' })).toString(), 'v.string()')
})

Deno.test('ValibotString - with minLength', () => {
  assertEquals(
    toValibotString(new OasString({ minLength: 3 })).toString(),
    'v.pipe(v.string(), v.minLength(3))'
  )
})

Deno.test('ValibotString - with maxLength', () => {
  assertEquals(
    toValibotString(new OasString({ maxLength: 20 })).toString(),
    'v.pipe(v.string(), v.maxLength(20))'
  )
})

Deno.test('ValibotString - a length of 0 keeps its check', () => {
  assertEquals(
    toValibotString(new OasString({ minLength: 0, maxLength: 0 })).toString(),
    'v.pipe(v.string(), v.minLength(0), v.maxLength(0))'
  )
})

Deno.test('ValibotString - a format keeps its length checks and modifiers', () => {
  assertEquals(
    toValibotString(new OasString({ format: 'email', minLength: 3, maxLength: 20 }), {
      required: false,
      nullable: true
    }).toString(),
    'v.optional(v.nullable(v.pipe(v.string(), v.email(), v.minLength(3), v.maxLength(20))))'
  )
})

Deno.test('ValibotString - a pattern renders v.regex() with the u flag', () => {
  assertEquals(
    toValibotString(new OasString({ pattern: '^[a-z/]+$' })).toString(),
    'v.pipe(v.string(), v.regex(/^[a-z/]+$/u))'
  )
})

Deno.test('ValibotString - a pattern valid only without the u flag renders without it', () => {
  assertEquals(
    toValibotString(new OasString({ pattern: '^a\\-b$' })).toString(),
    'v.pipe(v.string(), v.regex(/^a\\-b$/))'
  )
})

Deno.test('ValibotString - a pattern comes after the format and the lengths', () => {
  assertEquals(
    toValibotString(new OasString({ format: 'email', maxLength: 20, pattern: '@example\\.com$' })).toString(),
    'v.pipe(v.string(), v.email(), v.maxLength(20), v.regex(/@example\\.com$/u))'
  )
})

Deno.test('ValibotString - a pattern JavaScript rejects is left out, with a comment', () => {
  assertEquals(
    toValibotString(new OasString({ pattern: '(?i)abc' })).toString(),
    "/**\n * pattern '(?i)abc' is not a JavaScript regex, so it is not checked\n */\nv.string()"
  )
})

Deno.test('ValibotString - an enum beside a pattern JavaScript rejects does not skip or warn', () => {
  const valibotString = toValibotString(new OasString({ enums: ['a', 'b'], pattern: '(?i)abc' }))

  assertEquals(valibotString.skippedPattern, undefined)
  assertEquals(valibotString.toString(), "v.picklist(['a', 'b'])")
})

Deno.test('ValibotString - an enum drops its format, length and pattern checks', () => {
  assertEquals(
    toValibotString(
      new OasString({ enums: ['a@example.com', 'b@example.com'], format: 'email', maxLength: 20, pattern: '^x' })
    ).toString(),
    "v.picklist(['a@example.com', 'b@example.com'])"
  )
})
