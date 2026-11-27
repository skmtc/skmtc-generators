/**
 * The ground-truth gate: emit the fixture, then compile it.
 *
 * ArkType parses its definitions at the *type* level, so a definition it
 * cannot parse is a TypeScript error, not just a runtime throw —
 * `type("{ name: string }[]")` fails to check with
 *
 *   TS2345: Argument of type '"{ name: string }[]"' is not assignable to
 *           parameter of type '"'{' is unresolvable"'
 *
 * That makes `deno check` over the generated files a real correctness proof,
 * and it is the only layer that can give one: string equality against a pinned
 * expectation is just as happy to pin output arktype rejects.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which the
 * default test task deliberately does not grant.
 */
import { assertEquals } from '@std/assert'
import { dirname, join } from '@std/path'
import {
  additionalPropertiesCases,
  additionalPropertiesDocument,
  awkwardNamesDocument,
  checkGenerated,
  intersectionDocument,
  keepAllRefs,
  patternDocument,
  paymentValue,
  runE2eFixture,
  stringFormatCases,
  stringFormatDocument
} from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
import { arktypeEntry } from '../src/mod.ts'
import { runFixture } from './helpers/fixture.ts'

/** The arktype version the generated output is verified against — pinned
 *  exactly, because the gate rests on arktype's type-level parser and a minor
 *  release could change what it accepts without any change here. */
const ARKTYPE = 'npm:arktype@2.2.3'

// gen-arktype cannot render a model that refers to itself, and one such model
// fails the whole run, so these checks leave out `Tree` and its cases.
const { Tree: _tree, ...nonRecursiveSchemas } = additionalPropertiesDocument.components?.schemas ?? {}
const nonRecursiveDocument = { ...additionalPropertiesDocument, components: { schemas: nonRecursiveSchemas } }
const nonRecursiveCases = additionalPropertiesCases.filter(check => check.model !== 'Tree')

/**
 * Reads each named property as its own type, and checks every case of
 * `additionalPropertiesCases`. Loading it throws on the first case arktype
 * gets wrong.
 */
const additionalPropertiesConsumer = `import { type } from 'arktype'
import { upload } from '@/types/upload.generated.ts'
import { limits } from '@/types/limits.generated.ts'
import { dotted } from '@/types/dotted.generated.ts'

export const readUpload = (value: typeof upload.infer): string[] => [value.app_id, ...value.images]
export const readLimits = (value: typeof limits.infer): [string, string | undefined] => [value.id, value.note]
export const readDotted = (value: typeof dotted.infer): string => value['a.b']

const accepts: Record<string, (value: unknown) => boolean> = {
  Upload: value => !(upload(value) instanceof type.errors),
  Limits: value => !(limits(value) instanceof type.errors),
  Dotted: value => !(dotted(value) instanceof type.errors)
}

for (const check of ${JSON.stringify(nonRecursiveCases)}) {
  const accepted = accepts[check.model](check.value)
  if (accepted !== check.accept) {
    throw new Error(\`\${check.model}, \${check.name}: accepted is \${accepted}\`)
  }
}
`

// The trap: a \`[string]\` index signature checks every key, so a typed
// record beside named keys of other types does not even load: arktype
// throws "Intersection at id of string and number results in an
// unsatisfiable type" (#101).
Deno.test({
  name: 'typecheck - a record beside properties checks only the other keys',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-arktype',
      entry: arktypeEntry,
      document: nonRecursiveDocument
    })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/dotted.generated.ts',
      'src/types/limits.generated.ts',
      'src/types/upload.generated.ts'
    ])

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': additionalPropertiesConsumer },
        imports: { arktype: ARKTYPE }
      }),
      []
    )
  }
})

Deno.test({
  name: 'typecheck - generated artifacts compile against arktype',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runFixture()
    const root = await Deno.makeTempDir({ prefix: 'gen-arktype-typecheck-' })

    try {
      // The emitted files import `arktype` and the `@/` alias and nothing else,
      // so they check standalone against a config of their own.
      await Deno.writeTextFile(
        join(root, 'deno.json'),
        JSON.stringify({ imports: { '@/': './src/', arktype: ARKTYPE } }, null, 2)
      )

      for (const [path, content] of Object.entries(artifacts)) {
        const target = join(root, path)
        await Deno.mkdir(dirname(target), { recursive: true })
        await Deno.writeTextFile(target, content)
      }

      const check = await new Deno.Command('deno', {
        args: [
          'check',
          '--quiet',
          '--config',
          join(root, 'deno.json'),
          ...Object.keys(artifacts).map(path => join(root, path))
        ],
        env: { NO_COLOR: '1' },
        stdout: 'piped',
        stderr: 'piped'
      }).output()

      const decoder = new TextDecoder()
      const output = `${decoder.decode(check.stdout)}${decoder.decode(check.stderr)}`

      assertEquals(check.code, 0, `generated arktype does not compile:\n${output}`)
    } finally {
      await Deno.remove(root, { recursive: true })
    }
  }
})

// The trap: `decapitalize` turns `Default` into `default`, and
// `export const default = …` does not parse; `2FA` starts with a digit.
Deno.test({
  name: 'typecheck - schema names that are not valid bindings are repaired',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({ id: '@skmtc/gen-arktype', entry: arktypeEntry, document: awkwardNamesDocument })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/_2FA.generated.ts',
      'src/types/account.generated.ts',
      'src/types/defaultValue.generated.ts',
      'src/types/deleteValue.generated.ts'
    ])

    assertEquals(await checkGenerated({ artifacts, imports: { arktype: ARKTYPE } }), [])
  }
})

/**
 * Keys and enum values holding a quote or a backslash. arktype reads a
 * definition string with escapes of its own, inside the TypeScript string.
 */
const escapingDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Escaping fixture', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Quoted: { type: 'string', enum: ["it's", 'a"b', 'a\\b'] },
      Keys: {
        type: 'object',
        required: ['a"b', 'a\\b'],
        properties: { 'a"b': { type: 'string' }, 'a\\b': { type: 'string' } },
        additionalProperties: { type: 'number' }
      }
    }
  }
}

const escapingConsumer = `import { type } from 'arktype'
import { quoted } from '@/types/quoted.generated.ts'
import { keys } from '@/types/keys.generated.ts'

const accepts = (t: (value: unknown) => unknown, value: unknown): boolean => !(t(value) instanceof type.errors)

const checks: Array<[string, boolean]> = [
  ["it's is an enum value", accepts(quoted, "it's")],
  ['a"b is an enum value', accepts(quoted, 'a"b')],
  ['a\\\\b is an enum value', accepts(quoted, 'a\\\\b')],
  ['other is not an enum value', !accepts(quoted, 'other')],
  ['the named keys hold strings, an extra key a number', accepts(keys, { 'a"b': 'x', 'a\\\\b': 'y', count: 1 })],
  ['an extra key holding a string is rejected', !accepts(keys, { 'a"b': 'x', 'a\\\\b': 'y', count: 's' })]
]

for (const [name, passed] of checks) {
  if (!passed) {
    throw new Error(name)
  }
}
`

// The trap: two layers of escaping. A quote or backslash written for
// arktype inside a hand-quoted TypeScript string ended that string, and a
// backslash key's `\\` in the index pattern became `\` once arktype read it.
Deno.test({
  name: 'typecheck - keys and enum values holding a quote or backslash load and check',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({ id: '@skmtc/gen-arktype', entry: arktypeEntry, document: escapingDocument })

    assertEquals(Object.keys(artifacts).sort(), ['src/types/keys.generated.ts', 'src/types/quoted.generated.ts'])

    assertEquals(
      await checkGenerated({ artifacts: { ...artifacts, 'src/consumer.ts': escapingConsumer }, imports: { arktype: ARKTYPE } }),
      []
    )
  }
})

/**
 * Keys arktype reads as syntax of its own when written as they are: a
 * trailing `?`, `[…]`, `...` and `+`, required and optional. And an empty
 * enum.
 */
const keySyntaxDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Key syntax fixture', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Syntax: {
        type: 'object',
        required: ['foo?', '[x]', '...', '+', 'a\\?'],
        properties: {
          'foo?': { type: 'string' },
          '[x]': { type: 'string' },
          '...': { type: 'string' },
          '+': { type: 'string' },
          'a\\?': { type: 'string' },
          '[y]': { type: 'string' },
          'b?': { type: 'string' }
        },
        additionalProperties: { type: 'number' }
      },
      Empty: { type: 'string', enum: [] }
    }
  }
}

const keySyntaxConsumer = `import { type } from 'arktype'
import { syntax } from '@/types/syntax.generated.ts'
import { empty } from '@/types/empty.generated.ts'

const accepts = (t: (value: unknown) => unknown, value: unknown): boolean => !(t(value) instanceof type.errors)

const required: Record<string, string> = { 'foo?': 'x', '[x]': 'x', '...': 'x', '+': 'x', 'a\\\\?': 'x' }
const without = (key: string): Record<string, string> =>
  Object.fromEntries(Object.entries(required).filter(([name]) => name !== key))

const checks: Array<[string, boolean]> = [
  ['the required keys are plain keys', accepts(syntax, required)],
  ...Object.keys(required).map((key): [string, boolean] => [key + ' is required', !accepts(syntax, without(key))]),
  ['[y] and b? are optional', accepts(syntax, { ...required, '[y]': 'x', 'b?': 'x' })],
  ['[y] holds a string', !accepts(syntax, { ...required, '[y]': 1 })],
  ['b? holds a string', !accepts(syntax, { ...required, 'b?': 1 })],
  ['an extra key holds a number', accepts(syntax, { ...required, count: 1 })],
  ['an extra key holding a string is rejected', !accepts(syntax, { ...required, count: 's' })],
  ['an empty enum rejects a string', !accepts(empty, 'x')],
  ['an empty enum rejects null', !accepts(empty, null)]
]

for (const [name, passed] of checks) {
  if (!passed) {
    throw new Error(name)
  }
}
`

// The trap: a key written as it is can mean something else to arktype. The
// required key \`foo?\` became the optional key \`foo\`, and \`[x]\` became an
// index signature that threw "'x' is unresolvable" on load. An empty enum
// gave \`type("")\`.
Deno.test({
  name: 'typecheck - keys arktype reads as syntax, and an empty enum, load and check',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({ id: '@skmtc/gen-arktype', entry: arktypeEntry, document: keySyntaxDocument })

    assertEquals(Object.keys(artifacts).sort(), ['src/types/empty.generated.ts', 'src/types/syntax.generated.ts'])

    assertEquals(
      await checkGenerated({ artifacts: { ...artifacts, 'src/consumer.ts': keySyntaxConsumer }, imports: { arktype: ARKTYPE } }),
      []
    )
  }
})

// Parses a value through an intersection (Pet), and through a union whose
// members are intersections (Payment). Loading it throws when arktype
// refuses a value the document allows, or accepts a Pet without the key of
// Animal.
const intersectionConsumer = `import { type } from 'arktype'
import { pet } from '@/types/pet.generated.ts'
import { payment } from '@/types/payment.generated.ts'

const accepts = (schema: (value: unknown) => unknown, value: unknown): boolean =>
  !(schema(value) instanceof type.errors)

const checks: Array<[string, boolean]> = [
  ['Pet accepts the keys of both members', accepts(pet, { kind: 'dog', name: 'Rex' })],
  ['Pet without the key of Animal is rejected', !accepts(pet, { name: 'Rex' })],
  ['Payment accepts a member with the key of its base', accepts(payment, ${JSON.stringify(paymentValue)})]
]

for (const [name, passed] of checks) {
  if (!passed) {
    throw new Error(name)
  }
}
`

// The trap: arktype reads a tuple at the type level, so a tuple it does not
// take as an intersection is a TypeScript error here, and nowhere else.
Deno.test({
  name: 'typecheck - an intersection, and a union of intersections, compile against arktype and check',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-arktype',
      entry: arktypeEntry,
      document: intersectionDocument,
      system: keepAllRefs
    })

    assertEquals(Object.keys(artifacts).length, 6)

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': intersectionConsumer },
        imports: { arktype: ARKTYPE }
      }),
      []
    )
  }
})

/**
 * Models whose format arktype has no exact keyword for (`src/formats.ts`).
 * They stay a plain string, so they accept every case, also one
 * `stringFormatCases` marks as refused.
 */
const uncheckedModels = ['DateTime', 'Date', 'Duration', 'Uuid']

/** Loading it throws on the first case of `stringFormatCases` arktype gets wrong. */
const stringFormatConsumer = `import { type } from 'arktype'
import { dateTime } from '@/types/dateTime.generated.ts'
import { date } from '@/types/date.generated.ts'
import { duration } from '@/types/duration.generated.ts'
import { email } from '@/types/email.generated.ts'
import { uri } from '@/types/uri.generated.ts'
import { uuid } from '@/types/uuid.generated.ts'
import { ipv4 } from '@/types/ipv4.generated.ts'
import { ipv6 } from '@/types/ipv6.generated.ts'
import { uriTemplate } from '@/types/uriTemplate.generated.ts'
import { slug } from '@/types/slug.generated.ts'
import { workEmail } from '@/types/workEmail.generated.ts'

const models: Record<string, (value: unknown) => unknown> = {
  DateTime: dateTime,
  Date: date,
  Duration: duration,
  Email: email,
  Uri: uri,
  Uuid: uuid,
  Ipv4: ipv4,
  Ipv6: ipv6,
  UriTemplate: uriTemplate,
  Slug: slug,
  WorkEmail: workEmail
}

const unchecked: string[] = ${JSON.stringify(uncheckedModels)}

for (const check of ${JSON.stringify(stringFormatCases)}) {
  const accepted = !(models[check.model](check.value) instanceof type.errors)
  const expected = unchecked.includes(check.model) || check.accept
  if (accepted !== expected) {
    throw new Error(\`\${check.model}, \${JSON.stringify(check.value)}: accepted is \${accepted}\`)
  }
}
`

Deno.test({
  name: 'typecheck - each string format and pattern compiles against arktype and checks',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-arktype',
      entry: arktypeEntry,
      document: stringFormatDocument
    })

    assertEquals(Object.keys(artifacts).length, 11)

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': stringFormatConsumer },
        imports: { arktype: ARKTYPE }
      }),
      []
    )
  }
})

/**
 * A bounded string and a pattern where a parent wraps them: in an array, as
 * a nullable property, and as an optional one.
 */
const stringCheckPlacesDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'String checks in place', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Tags: { type: 'array', items: { type: 'string', maxLength: 3 } },
      Words: { type: 'array', items: { type: 'string', pattern: '^\\p{L}+$' } },
      Profile: {
        type: 'object',
        required: ['nick'],
        properties: {
          nick: { type: 'string', minLength: 2, pattern: '^[a-z]+$', nullable: true },
          bio: { type: 'string', maxLength: 5 }
        }
      }
    }
  }
}

const stringCheckPlacesConsumer = `import { type } from 'arktype'
import { tags } from '@/types/tags.generated.ts'
import { words } from '@/types/words.generated.ts'
import { profile } from '@/types/profile.generated.ts'

const cases: Array<[string, (value: unknown) => unknown, unknown, boolean]> = [
  // The trap: \`string <= 3[]\` bounds the array, so it refused one short tag.
  ['Tags', tags, ['abc'], true],
  ['Tags', tags, ['abcd'], false],
  // The trap: without the u flag, \\\\p{L} matches the text p{L}.
  ['Words', words, ['été'], true],
  ['Words', words, ['p{L}'], false],
  ['Profile', profile, { nick: 'ada' }, true],
  ['Profile', profile, { nick: null, bio: 'hi' }, true],
  ['Profile', profile, { nick: 'Ada' }, false],
  ['Profile', profile, { nick: 'a' }, false],
  ['Profile', profile, { nick: 'ada', bio: 'too long' }, false]
]

for (const [name, check, value, accept] of cases) {
  const accepted = !(check(value) instanceof type.errors)
  if (accepted !== accept) {
    throw new Error(\`\${name}, \${JSON.stringify(value)}: accepted is \${accepted}\`)
  }
}
`

Deno.test({
  name: 'typecheck - a bounded string and a pattern check the same inside an array or a property',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-arktype',
      entry: arktypeEntry,
      document: stringCheckPlacesDocument
    })

    assertEquals(Object.keys(artifacts).length, 3)

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': stringCheckPlacesConsumer },
        imports: { arktype: ARKTYPE }
      }),
      []
    )
  }
})

// The trap: a pattern ending in `\` or written for another engine made the
// file fail to parse; a `*/` in the comment that replaces it would end the
// comment early. Every file has to compile and load.
Deno.test({
  name: 'typecheck - every pattern renders as a regex or a comment, and compiles',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-arktype',
      entry: arktypeEntry,
      document: patternDocument
    })

    assertEquals(Object.keys(artifacts).length, 6)

    assertEquals(await checkGenerated({ artifacts, imports: { arktype: ARKTYPE } }), [])
  }
})
