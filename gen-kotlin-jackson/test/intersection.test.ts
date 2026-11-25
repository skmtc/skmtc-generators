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
