/** How an `allOf` that keeps a ref renders (#117). `typecheck.test.ts` checks that the files compile and what they decode. */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { OasInteger, OasIntersection, OasObject, OasString } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import {
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  loopDocument,
  loopError,
  runE2eFixture,
  toDocumentObject,
  toRunError,
  toSchemasDocument,
} from '@skmtc/test-support'
import { effectSchemaEntry } from '../src/mod.ts'
import { needsCoercion } from '../src/coercion.ts'

const id = '@skmtc/gen-effect-schema'
const entry = effectSchemaEntry

const run = (document: OpenAPIV3.Document) =>
  runE2eFixture({ id, entry, document, system: keepAllRefs })

const animal: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: { kind: { type: 'string' }, age: { type: 'integer' } },
}

const $ref = '#/components/schemas/Animal'

/** The model `Pet`, an intersection of Animal and the members given. */
const runPet = (
  members: (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject)[],
  base: OpenAPIV3.SchemaObject = animal,
) =>
  run(toSchemasDocument({ Animal: base, Pet: { allOf: [{ $ref }, ...members] } }))

const petPath = 'src/schema-effect/pet.generated.ts'

Deno.test('intersection - a ref and an object', () => {
  assertStringIncludes(
    run(intersectionDocument).artifacts[petPath],
    'export const Pet = Schema.Struct({...Animal.fields, name: Schema.optional(Schema.String)});',
  )
})

Deno.test('intersection - a nullable one in a property', () => {
  assertStringIncludes(
    run(intersectionDocument).artifacts['src/schema-effect/owner.generated.ts'],
    'Schema.optional(Schema.NullOr(Schema.Struct({...Animal.fields, name: Schema.optional(Schema.String)})))',
  )
})

Deno.test('intersection - a property one member requires is required', () => {
  assertStringIncludes(
    runPet([{ type: 'object', required: ['age'] }]).artifacts[petPath],
    'Schema.Struct({...Animal.fields, age: Schema.Int})',
  )
})

Deno.test('intersection - of a string and its enum, the enum', () => {
  assertStringIncludes(
    runPet([{ type: 'object', properties: { kind: { type: 'string', enum: ['pet'] } } }]).artifacts[petPath],
    'Schema.Struct({...Animal.fields, kind: Schema.optional(Schema.Literal("pet"))})',
  )
})

Deno.test('intersection - a spread later in the list does not undo a narrower property', () => {
  const { artifacts } = run(
    toSchemasDocument({
      Animal: animal,
      Pet: {
        allOf: [
          { type: 'object', required: ['kind'], properties: { kind: { type: 'string', enum: ['pet'] } } },
          { $ref },
        ],
      },
    }),
  )

  assertStringIncludes(
    artifacts[petPath],
    'Schema.Struct({...Animal.fields, kind: Schema.Literal("pet")})',
  )
})

// The trap: `'constructor' in {}` is true.
Deno.test('intersection - a property of a model named as a member of every JavaScript object', () => {
  const text: OpenAPIV3.SchemaObject = { type: 'string' }

  assertStringIncludes(
    runPet([{ type: 'object', properties: { name: text } }], {
      type: 'object',
      properties: { constructor: text },
    }).artifacts[petPath],
    'Schema.Struct({...Animal.fields, name: Schema.optional(Schema.String)})',
  )
})

Deno.test('intersection - any value adds no field', () => {
  assertStringIncludes(
    run(toSchemasDocument({
      Animal: animal,
      Other: { type: 'object', properties: { other: { type: 'string' } } },
      Pet: { allOf: [{ $ref }, { description: 'A note' }, { $ref: '#/components/schemas/Other' }] },
    })).artifacts[petPath],
    'Schema.Struct({...Animal.fields, ...Other.fields})',
  )
})

Deno.test('intersection - a limit that one member adds is kept', () => {
  assertStringIncludes(
    runPet([{ type: 'object', properties: { age: { type: 'integer', minimum: 1 } } }]).artifacts[petPath],
    'Schema.Struct({...Animal.fields, age: Schema.optional(Schema.Int.check(',
  )
})

Deno.test('intersection - any value beside a reference in a cycle is the reference', () => {
  const { artifacts } = runE2eFixture({
    id,
    entry,
    document: toSchemasDocument({
      Node: {
        type: 'object',
        properties: { parent: { allOf: [{ $ref: '#/components/schemas/Node' }, { description: 'The parent' }] } },
      },
    }),
  })

  assertStringIncludes(
    artifacts['src/schema-effect/node.generated.ts'],
    'parent: Schema.optional(Schema.suspend(',
  )
})

Deno.test('intersection - any value beside a reference to a string is the reference', () => {
  assertStringIncludes(
    run(toSchemasDocument({
      Id: { type: 'string' },
      Pet: {
        type: 'object',
        properties: {
          id: { nullable: true, allOf: [{ $ref: '#/components/schemas/Id' }, { description: 'The id' }] },
        },
      },
    })).artifacts[petPath],
    'id: Schema.optional(Schema.NullOr(Id))',
  )
})

Deno.test('intersection - a default is kept when a later member has none', () => {
  const { artifacts } = runE2eFixture({
    id,
    entry,
    document: toSchemasDocument({
      Animal: { type: 'object', properties: { kind: { type: 'string', default: 'x' } } },
      Pet: {
        allOf: [{ $ref }, { type: 'object', properties: { kind: { type: 'string' } } }],
      },
    }),
    system: keepAllRefs,
    enrichments: { _generator: { defaults: true } },
  })

  assertStringIncludes(artifacts[petPath], 'kind: Schema.String.pipe(Schema.withDecodingDefaultType(Effect.succeed("x")))')
})

const toSiteDocument = (keywords: Record<string, unknown>) =>
  toDocumentObject({
    openapi: '3.1.0',
    info: { title: 'Site keywords', version: '1' },
    paths: {},
    components: {
      schemas: {
        Animal: animal,
        Pet: { allOf: [{ $ref, ...keywords }, { type: 'object', properties: { name: { type: 'string' } } }] },
      },
    },
  }, 'site keywords')

Deno.test('intersection - the keywords next to a member reference are kept', () => {
  const text = { type: 'string' }

  assertStringIncludes(
    run(toSiteDocument({ properties: { extra: text }, required: ['extra'] })).artifacts[petPath],
    'Schema.Struct({...Animal.fields, extra: Schema.String, name: Schema.optional(Schema.String)})',
  )
  assertStringIncludes(
    run(toSiteDocument({ required: ['age'] })).artifacts[petPath],
    'Schema.Struct({...Animal.fields, age: Schema.Int, name: Schema.optional(Schema.String)})',
  )
  assertStringIncludes(
    run(toSiteDocument({ properties: { kind: { type: 'string', enum: ['a'] } } })).artifacts[petPath],
    'kind: Schema.optional(Schema.Literal("a"))',
  )
  assertStringIncludes(
    toRunError(run(toSiteDocument({ additionalProperties: text }))),
    '#/components/schemas/Pet/allOf is an intersection that Effect cannot write: a member has additionalProperties next to a reference',
  )
})

Deno.test('intersection - two schemas of one property fail and are named', () => {
  assertStringIncludes(
    toRunError(runPet([{ type: 'object', properties: { age: { type: 'string' } } }])),
    "#/components/schemas/Pet/allOf is an intersection that cannot be one object: two members have a property 'age'",
  )
})

Deno.test('intersection - a member that is not an object fails and is named', () => {
  const error = toRunError(run(toSchemasDocument({
    Animal: animal,
    Pet: {
      allOf: [{ $ref }, { oneOf: [{ type: 'object', properties: { a: { type: 'string' } } }, { type: 'object', properties: { b: { type: 'string' } } }] }],
    },
  })))

  assertStringIncludes(error, '#/components/schemas/Pet/allOf is an intersection that cannot be one object')
  assertStringIncludes(error, 'of type union, not an object')
})

Deno.test('intersection - a member in a cycle fails and is named', () => {
  assertStringIncludes(
    toRunError(runE2eFixture({ id, entry, document: intersectionCycleDocument })),
    '#/components/schemas/Closed/allOf is an intersection that Effect cannot write: the fields of its member #/components/schemas/Base are not known',
  )
})

// Built first, Sub refers to a Base that is complete, not `suspended`. It is in a
// cycle all the same, and which of the two modules loads first is not known.
Deno.test('intersection - a member in a cycle whose model is built already fails and is named', () => {
  const document = toSchemasDocument({
    Sub: {
      allOf: [{ $ref: '#/components/schemas/Base' }, { type: 'object', properties: { name: { type: 'string' } } }],
    },
    Base: { type: 'object', properties: { subs: { type: 'array', items: { $ref: '#/components/schemas/Sub' } } } },
  })

  assertStringIncludes(
    toRunError(runE2eFixture({ id, entry, document })),
    '#/components/schemas/Sub/allOf is an intersection that Effect cannot write: the fields of its member #/components/schemas/Base are not known',
  )
})

for (
  const [name, base] of Object.entries<OpenAPIV3.SchemaObject>({
    'nullable model': { ...animal, nullable: true },
    'model with a record': { ...animal, additionalProperties: { type: 'string' } },
  })
) {
  Deno.test(`intersection - a ${name} has no fields to spread: it fails and is named`, () => {
    assertStringIncludes(
      toRunError(runPet([{ type: 'object', properties: { name: { type: 'string' } } }], base)),
      '#/components/schemas/Pet/allOf is an intersection that Effect cannot write: the fields of its member #/components/schemas/Animal are not known',
    )
  })
}

Deno.test('intersection - an inheritance loop fails and is named', () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: loopDocument })), loopError)
})

Deno.test('intersection - it needs coercion when a member does', () => {
  const text = new OasObject({ properties: { a: new OasString({}) } })
  const count = new OasObject({ properties: { b: new OasInteger({}) } })

  assertEquals(needsCoercion(new OasIntersection({ members: [text, count] })), true)
  assertEquals(needsCoercion(new OasIntersection({ members: [text] })), false)
})
