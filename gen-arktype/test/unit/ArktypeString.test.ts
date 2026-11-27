import { assertEquals } from '@std/assert'
import { ArktypeString } from '@skmtc/gen-arktype'
import { OasString } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import arktypeEntry from '@skmtc/gen-arktype'
import type { Modifiers } from '@skmtc/core'
import { formatKeywords } from '../../src/formats.ts'

Deno.test('ArktypeString - basic string type', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string"')
})

Deno.test('ArktypeString - single enum value', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['active'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"\'active\'"')
})

Deno.test('ArktypeString - multiple enum values', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['active', 'inactive', 'pending'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), "\"'active' | 'inactive' | 'pending'\"")
})

Deno.test('ArktypeString - nullable string', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string | null"')
})

Deno.test('ArktypeString - optional string', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string | undefined"')
})

Deno.test('ArktypeString - optional and nullable string', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: undefined }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string | null | undefined"')
})

Deno.test('ArktypeString - with format (should not affect output)', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: undefined, format: 'date-time' }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  assertEquals(arktypeString.toString(), '"string"')
})

Deno.test('ArktypeString - a null enum member is the null keyword', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ['active', null], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  // Not `'null'` — that is the four-character string, not the null type.
  assertEquals(arktypeString.toString(), '"\'active\' | null"')
})

Deno.test('ArktypeString - quotes and backslashes in enum values are escaped', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ["it's", 'a\\b'], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  // An unescaped quote would end the literal early and leave arktype a
  // definition it cannot parse. Two layers: arktype's `\'` and `\\`, then
  // the TypeScript string around them, which doubles each backslash.
  assertEquals(arktypeString.toString(), String.raw`"'it\\'s' | 'a\\\\b'"`)
})

Deno.test('ArktypeString - an empty enum accepts nothing', () => {
  const arktypeString = new ArktypeString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: [], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

  // The trap: the members joined to `""`, which arktype cannot parse.
  assertEquals(arktypeString.toString(), '"never"')
})

const toArktypeString = (stringSchema: OasString, modifiers: Modifiers = { required: true }) =>
  new ArktypeString({
    context: toGenerateContext(),
    stringSchema,
    modifiers,
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id }),
    destinationPath: '/test'
  })

// Written out, not read from `formatKeywords`, so a wrong entry there fails.
const mappedFormats: Array<[string, string]> = [
  ['email', '"string.email"'],
  ['uri', '"string.url"'],
  ['ipv4', '"string.ip.v4"'],
  ['ipv6', '"string.ip.v6"']
]

for (const [format, expected] of mappedFormats) {
  Deno.test(`ArktypeString - format ${format} renders ${expected}`, () => {
    assertEquals(toArktypeString(new OasString({ format })).toString(), expected)
  })
}

Deno.test('ArktypeString - every format in formatKeywords has a test', () => {
  assertEquals([...formatKeywords.keys()].sort(), mappedFormats.map(([format]) => format).sort())
})

// The trap: `string.date.iso` takes a date alone for a date-time, and
// `string.uuid` refuses a valid uuid whose version digit is 0.
Deno.test('ArktypeString - a format arktype has no exact keyword for stays string', () => {
  for (const format of ['date-time', 'date', 'uuid', 'duration', 'uri-template']) {
    assertEquals(toArktypeString(new OasString({ format })).toString(), '"string"')
  }
})

// The trap: a format name such as `constructor` is a key of every object.
Deno.test('ArktypeString - a format named after an Object.prototype key stays string', () => {
  assertEquals(toArktypeString(new OasString({ format: 'constructor' })).toString(), '"string"')
})

Deno.test('ArktypeString - with minLength', () => {
  assertEquals(toArktypeString(new OasString({ minLength: 3 })).toString(), '"(string >= 3)"')
})

Deno.test('ArktypeString - with maxLength', () => {
  assertEquals(toArktypeString(new OasString({ maxLength: 20 })).toString(), '"(string <= 20)"')
})

Deno.test('ArktypeString - with minLength and maxLength', () => {
  assertEquals(toArktypeString(new OasString({ minLength: 3, maxLength: 20 })).toString(), '"(3 <= string <= 20)"')
})

Deno.test('ArktypeString - a length of 0 keeps its check', () => {
  assertEquals(toArktypeString(new OasString({ minLength: 0, maxLength: 0 })).toString(), '"(0 <= string <= 0)"')
})

// The trap: `string <= 20[]` parses, and bounds the array.
Deno.test('ArktypeString - a bounded string keeps its parentheses where a parent adds a suffix', () => {
  const arktypeString = toArktypeString(new OasString({ maxLength: 20 }))

  assertEquals(arktypeString.atomicStringSyntax, '(string <= 20)')
})

Deno.test('ArktypeString - a format keeps its length checks and modifiers', () => {
  const arktypeString = toArktypeString(new OasString({ format: 'email', minLength: 3, maxLength: 20 }), {
    required: false,
    nullable: true
  })

  assertEquals(arktypeString.toString(), '"(3 <= string.email <= 20) | null | undefined"')
})

Deno.test('ArktypeString - a pattern is a RegExp beside the string syntax, with the u flag', () => {
  const arktypeString = toArktypeString(new OasString({ pattern: '^\\p{L}+$' }))

  assertEquals(arktypeString.toString(), '["string", "&", /^\\p{L}+$/u]')
  // A parent takes the value form, not string syntax, of the pattern.
  assertEquals(arktypeString.stringSyntax, undefined)
  assertEquals(arktypeString.atomicStringSyntax, undefined)
})

Deno.test('ArktypeString - a pattern valid only without the u flag renders without it', () => {
  assertEquals(toArktypeString(new OasString({ pattern: '^a\\-b$' })).toString(), '["string", "&", /^a\\-b$/]')
})

Deno.test('ArktypeString - a pattern sits beside the format and the lengths, inside the modifiers', () => {
  const arktypeString = toArktypeString(
    new OasString({ format: 'email', maxLength: 20, pattern: '@example\\.com$' }),
    { required: true, nullable: true }
  )

  assertEquals(arktypeString.toString(), '[["(string.email <= 20)", "&", /@example\\.com$/u], "|", "null"]')
})

Deno.test('ArktypeString - a pattern JavaScript rejects is left out, with a comment', () => {
  assertEquals(
    toArktypeString(new OasString({ pattern: '(?i)abc' })).toString(),
    "/**\n * pattern '(?i)abc' is not a JavaScript regex, so it is not checked\n */\n\"string\""
  )
})

Deno.test('ArktypeString - an enum beside a pattern JavaScript rejects does not skip or warn', () => {
  const arktypeString = toArktypeString(new OasString({ enums: ['a', 'b'], pattern: '(?i)abc' }))

  assertEquals(arktypeString.skippedPattern, undefined)
  assertEquals(arktypeString.toString(), `"'a' | 'b'"`)
})

Deno.test('ArktypeString - an enum drops its format, length and pattern checks', () => {
  assertEquals(
    toArktypeString(
      new OasString({ enums: ['a@example.com', 'b@example.com'], format: 'email', maxLength: 20, pattern: '^x' })
    ).toString(),
    `"'a@example.com' | 'b@example.com'"`
  )
})
