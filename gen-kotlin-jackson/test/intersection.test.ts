/** How an `allOf` that keeps a ref renders (#117): Kotlin has no intersection type, so as one class. */
import { assertEquals, assertStringIncludes } from '@std/assert'
import type { SystemSettings } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import {
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  loopDocument,
  loopError,
  runE2eFixture,
  toRunError,
  toSchemasDocument,
} from '@skmtc/test-support'
import { kotlinJacksonEntry } from '../src/mod.ts'

const run = (document: OpenAPIV3.Document, system?: SystemSettings) =>
  runE2eFixture({
    id: '@skmtc/gen-kotlin-jackson',
    entry: kotlinJacksonEntry,
    document,
    system,
    enrichments: { _generator: { basePackage: 'com.acme' } },
  })

const $ref = '#/components/schemas/Animal'

const animal: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: { kind: { type: 'string' }, age: { type: 'integer' } },
}

const runPet = (member: OpenAPIV3.SchemaObject, base: OpenAPIV3.SchemaObject = animal) =>
  run(toSchemasDocument({ Animal: base, Pet: { allOf: [{ $ref }, member] } }), keepAllRefs)

const pathOf = (name: string) => `src/com/acme/${name}.generated.kt`

Deno.test('intersection - a ref and an object are one data class', () => {
  assertStringIncludes(
    run(intersectionDocument, keepAllRefs).artifacts[pathOf('Pet')],
    'data class Pet(\n    val kind: String,\n    val name: String? = null\n)',
  )
})

Deno.test('intersection - an inline one is a synthesized data class', () => {
  const { artifacts } = run(intersectionDocument, keepAllRefs)

  assertStringIncludes(artifacts[pathOf('Owner')], 'val pet: OwnerPet? = null')
  assertStringIncludes(artifacts[pathOf('OwnerPetsItem')], 'val kind: String,\n    val name: String? = null')
})

Deno.test('intersection - a member of a sealed union', () => {
  const { artifacts } = run(intersectionDocument, keepAllRefs)

  assertStringIncludes(artifacts[pathOf('Payment')], 'sealed interface Payment')
  assertStringIncludes(artifacts[pathOf('Card')], 'val amount: Double,\n    val number: String\n) : Payment')
})

// The trap: the class of the items of `Node.children` holds `children`, at the
// same position, so the walk of its properties came back to it until the stack overflowed.
Deno.test('intersection - a ref that closes a cycle through a property', () => {
  const { artifacts } = run(intersectionCycleDocument)

  assertStringIncludes(
    artifacts[pathOf('NodeChildrenItem')],
    'val name: String,\n    val children: List<NodeChildrenItem>,\n    val extra: String? = null',
  )
})

Deno.test('intersection - additionalProperties: false is left out', () => {
  const closed = run(intersectionCycleDocument).artifacts[pathOf('Closed')]

  assertStringIncludes(closed, 'val kind: String,')
  assertStringIncludes(closed, 'val b: String? = null')
})

Deno.test('intersection - a property one member requires is required', () => {
  assertStringIncludes(runPet({ type: 'object', required: ['age'] }).artifacts[pathOf('Pet')], 'val age: Int\n')
})

Deno.test('intersection - the record of a member is the catch-all of the class', () => {
  assertStringIncludes(
    runPet({ type: 'object', properties: { name: { type: 'string' } } }, { ...animal, additionalProperties: { type: 'string' } })
      .artifacts[pathOf('Pet')],
    'val additionalProperties: MutableMap<String, String>',
  )
})

Deno.test('intersection - of a string and its enum, the enum', () => {
  assertStringIncludes(
    runPet({ type: 'object', properties: { kind: { type: 'string', enum: ['pet'] } } }).artifacts[pathOf('Pet')],
    'val kind: PetKind? = null',
  )
})

Deno.test('intersection - of an enum and some of its values, the fewer', () => {
  const kind = (values: string[]): OpenAPIV3.SchemaObject => ({
    type: 'object',
    properties: { kind: { type: 'string', enum: values } },
  })

  assertEquals(
    runPet(kind(['a']), kind(['a', 'b'])).artifacts[pathOf('PetKind')].includes('@JsonProperty("b")'),
    false,
  )

  assertStringIncludes(toRunError(runPet(kind(['a', 'c']), kind(['a', 'b']))), "two members have a property 'kind'")
})

Deno.test('intersection - two schemas of one property that differ in annotations only are the same', () => {
  const tags = (description: string): OpenAPIV3.SchemaObject => ({
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        readOnly: description === 'One',
        items: { type: 'object', properties: { title: { type: 'string', description } } },
      },
    },
  })

  assertStringIncludes(runPet(tags('One'), tags('Two')).artifacts[pathOf('Pet')], 'val tags: List<PetTagsItem>? = null')

  // `title` is a property here, not an annotation.
  const other: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: { tags: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' } } } } },
  }

  assertStringIncludes(toRunError(runPet(other, tags('Two'))), "two members have a property 'tags'")
})

const toObject = (properties: OpenAPIV3.SchemaObject['properties']): OpenAPIV3.SchemaObject => ({ type: 'object', properties })

const x: OpenAPIV3.SchemaObject = { type: 'string' }
const row: OpenAPIV3.SchemaObject = { type: 'object', properties: { x } }

/** What Pet writes for the property `p` that Animal and Pet both declare. */
const narrowings: Record<string, [OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, string]> = {
  'a value of an enum by reference': [{ $ref: '#/components/schemas/Kind' }, { type: 'string', enum: ['a'] }, 'val p: PetP? = null'],
  'a minimum': [{ type: 'integer' }, { type: 'integer', minimum: 1 }, 'val p: Int? = null'],
  'a higher minimum': [{ type: 'integer', minimum: 1 }, { type: 'integer', minimum: 2 }, 'val p: Int? = null'],
  'a maxLength': [x, { type: 'string', maxLength: 10 }, 'val p: String? = null'],
  'not null': [{ type: 'string', nullable: true }, x, 'val p: String? = null'],
  'any value': [{}, x, 'val p: String? = null'],
  'any value after': [x, { description: 'Text' }, 'val p: String? = null'],
  'the items of an array': [
    { type: 'array', items: { type: 'object' } },
    { type: 'array', items: { $ref: '#/components/schemas/Row' } },
    'val p: List<Row>? = null',
  ],
  'the order of keys': [toObject({ x, y: x }), toObject({ y: x, x }), 'val p: PetP? = null'],
  'a required key': [row, { ...row, required: ['x'] }, 'val p: PetP? = null'],
  'a typed record': [{ type: 'object' }, { type: 'object', additionalProperties: x }, 'val p: Map<String, String>? = null'],
  'a branch of a union': [{ oneOf: [x, { type: 'integer' }] }, x, 'val p: String? = null'],
}

for (const [name, [base, own, expected]] of Object.entries(narrowings)) {
  for (const [order, first, second] of [['after', base, own], ['before', own, base]] as const) {
    Deno.test(`intersection - ${name}, ${order} the wider schema of the property, is the property`, () => {
      const { artifacts } = run(
        toSchemasDocument({
          Kind: { type: 'string', enum: ['a', 'b'] },
          Row: row,
          Animal: toObject({ p: first }),
          Pet: { allOf: [{ $ref }, toObject({ p: second })] },
        }),
        keepAllRefs,
      )

      // An inline class is named from the position that the narrower one is at.
      assertStringIncludes(
        artifacts[pathOf('Pet')].replace(/\bAnimalP\b/, 'PetP'),
        expected,
      )
    })
  }
}

for (
  const [name, first, second] of [
    ['two types', x, { type: 'integer' }],
    ['a value that is not in the enum', { type: 'string', enum: ['a'] }, { type: 'string', enum: ['c'] }],
    ['a minimum and a maximum', { type: 'integer', minimum: 1 }, { type: 'integer', maximum: 5 }],
    ['a value that can be null in the enum that cannot', { type: 'string', enum: ['a', 'b'] }, { type: 'string', enum: ['a'], nullable: true }],
    ['two sets of keys', toObject({ x }), toObject({ y: x })],
  ] satisfies [string, OpenAPIV3.SchemaObject, OpenAPIV3.SchemaObject][]
) {
  Deno.test(`intersection - ${name}: neither schema is the narrower, and they fail by name`, () => {
    assertStringIncludes(toRunError(runPet(toObject({ p: second }), toObject({ p: first }))), "two members have a property 'p'")
  })
}

Deno.test('intersection - a value that can be null in every member can be null', () => {
  const toOwner = (nullable: boolean) =>
    run(
      toSchemasDocument({
        A: { ...row, nullable: true },
        B: { ...toObject({ y: x }), nullable },
        Owner: {
          type: 'object',
          required: ['p'],
          properties: { p: { allOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }] } },
        },
      }),
      keepAllRefs,
    ).artifacts[pathOf('Owner')]

  assertStringIncludes(toOwner(true), 'val p: OwnerP? = null')
  assertStringIncludes(toOwner(false), 'val p: OwnerP\n')
})

// The trap: `'constructor' in {}` is true.
Deno.test('intersection - a property named as a member of every JavaScript object', () => {
  const text: OpenAPIV3.SchemaObject = { type: 'string' }

  assertStringIncludes(
    runPet({ type: 'object', properties: { constructor: text } }).artifacts[pathOf('Pet')],
    'val constructor: String? = null',
  )
})

Deno.test('intersection - any value beside a ref adds nothing to it', () => {
  const { artifacts } = run(
    toSchemasDocument({
      Animal: animal,
      Owner: {
        type: 'object',
        properties: { pet: { allOf: [{ $ref }, { description: 'A note', nullable: true }] } },
      },
    }),
    keepAllRefs,
  )

  assertStringIncludes(artifacts[pathOf('Owner')], 'val pet: Animal? = null')
  assertEquals(pathOf('OwnerPet') in artifacts, false)
})

Deno.test('intersection - two schemas of one property fail and are named', () => {
  assertStringIncludes(
    toRunError(runPet({ type: 'object', properties: { age: { type: 'string' } } })),
    "#/components/schemas/Pet/allOf is an intersection that cannot be one object: two members have a property 'age'",
  )
})

Deno.test('intersection - two records of two schemas fail and are named', () => {
  assertStringIncludes(
    toRunError(runPet(
      { type: 'object', additionalProperties: { type: 'string' } },
      { ...animal, additionalProperties: { type: 'integer' } },
    )),
    '#/components/schemas/Pet/allOf is an intersection that cannot be one object: two members have additionalProperties',
  )
})

Deno.test('intersection - a member that is not an object fails and is named', () => {
  assertStringIncludes(
    toRunError(run(
      toSchemasDocument({ Animal: { type: 'string' }, Pet: { allOf: [{ $ref }, { type: 'string', minLength: 3 }] } }),
      keepAllRefs,
    )),
    '#/components/schemas/Pet/allOf is an intersection that cannot be one object: its member #/components/schemas/Animal is of type string, not an object',
  )
})

Deno.test('intersection - an inheritance loop fails and is named', () => {
  assertStringIncludes(toRunError(run(loopDocument)), loopError)
})
