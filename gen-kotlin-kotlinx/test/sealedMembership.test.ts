import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { StackTrail } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import type { RefName } from '@skmtc/core'
import { isSealedUnion, toSealedMembership } from '../src/sealedMembership.ts'
import { toParseContext } from './helpers/toParseContext.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

const toContext = (
  schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
) => {
  const parsed = toParseContext({ schemas }).parse(new StackTrail([]))

  return toGenerateContext({ oasDocument: parsed })
}

const dog: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: { name: { type: 'string' }, barkVolume: { type: 'integer', format: 'int64' } },
  required: ['name']
}

const cat: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: { name: { type: 'string' }, huntingSkill: { type: 'string' } },
  required: ['name']
}

Deno.test('a discriminated all-ref union of data classes qualifies and inverts', () => {
  const context = toContext({
    Animal: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ],
      discriminator: {
        propertyName: 'petType',
        mapping: {
          dog: '#/components/schemas/Dog',
          cat: '#/components/schemas/Cat'
        }
      }
    },
    Dog: dog,
    Cat: cat
  })

  const membership = toSealedMembership(context)

  assertEquals(membership.get('Dog' as RefName), [
    { parentRefName: 'Animal', tag: 'dog', discriminatorPropertyName: 'petType' }
  ])
  assertEquals(membership.get('Cat' as RefName), [
    { parentRefName: 'Animal', tag: 'cat', discriminatorPropertyName: 'petType' }
  ])
  assertEquals(membership.has('Animal' as RefName), false)
})

Deno.test('absent mapping falls back to the member refName as the tag (the OpenAPI default)', () => {
  const context = toContext({
    Animal: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ],
      discriminator: { propertyName: 'petType' }
    },
    Dog: dog,
    Cat: cat
  })

  const membership = toSealedMembership(context)

  assertEquals(membership.get('Dog' as RefName)?.[0]?.tag, 'Dog')
  assertEquals(membership.get('Cat' as RefName)?.[0]?.tag, 'Cat')
})

Deno.test('mapping values accept both full ref strings and bare schema names', () => {
  const context = toContext({
    Animal: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ],
      discriminator: {
        propertyName: 'petType',
        mapping: {
          dog: '#/components/schemas/Dog',
          cat: 'Cat'
        }
      }
    },
    Dog: dog,
    Cat: cat
  })

  const membership = toSealedMembership(context)

  assertEquals(membership.get('Dog' as RefName)?.[0]?.tag, 'dog')
  assertEquals(membership.get('Cat' as RefName)?.[0]?.tag, 'cat')
})

Deno.test('a member claimed by two parents carries both claims', () => {
  const context = toContext({
    Animal: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ],
      discriminator: { propertyName: 'petType' }
    },
    Pet: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Hamster' }
      ],
      discriminator: { propertyName: 'species' }
    },
    Dog: dog,
    Cat: cat,
    Hamster: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    }
  })

  const membership = toSealedMembership(context)

  assertEquals(membership.get('Dog' as RefName), [
    { parentRefName: 'Animal', tag: 'Dog', discriminatorPropertyName: 'petType' },
    { parentRefName: 'Pet', tag: 'Dog', discriminatorPropertyName: 'species' }
  ])
})

Deno.test('non-qualifying unions contribute no membership', () => {
  const context = toContext({
    // No discriminator.
    Undiscriminated: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ]
    },
    // Inline member.
    InlineMember: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { type: 'object', properties: { x: { type: 'string' } } }
      ],
      discriminator: { propertyName: 'kind' }
    },
    // Member target is not an object-with-properties.
    PrimitiveMember: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Tag' }
      ],
      discriminator: { propertyName: 'kind' }
    },
    Dog: dog,
    Cat: cat,
    Tag: { type: 'string' }
  })

  assertEquals(toSealedMembership(context).size, 0)
})

Deno.test('isSealedUnion mirrors the membership predicate on the parent schema', () => {
  const context = toContext({
    Animal: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ],
      discriminator: { propertyName: 'petType' }
    },
    Undiscriminated: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ]
    },
    Dog: dog,
    Cat: cat
  })

  const { document } = context

  if (document.type !== 'oas') {
    throw new Error('expected an OAS document')
  }

  const animal = document.value.components?.schemas?.['Animal' as RefName]
  const undiscriminated = document.value.components?.schemas?.['Undiscriminated' as RefName]

  if (!animal || animal.isRef() || animal.type !== 'union') {
    throw new Error('Animal did not parse to a union')
  }

  if (!undiscriminated || undiscriminated.isRef() || undiscriminated.type !== 'union') {
    throw new Error('Undiscriminated did not parse to a union')
  }

  assertEquals(isSealedUnion(context, animal), true)
  assertEquals(isSealedUnion(context, undiscriminated), false)
})

Deno.test('the scan memoizes per document object', () => {
  const context = toContext({
    Animal: {
      oneOf: [
        { $ref: '#/components/schemas/Dog' },
        { $ref: '#/components/schemas/Cat' }
      ],
      discriminator: { propertyName: 'petType' }
    },
    Dog: dog,
    Cat: cat
  })

  const first = toSealedMembership(context)
  const second = toSealedMembership(context)

  assertEquals(first === second, true)
})
