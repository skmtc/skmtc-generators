import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts, toRefParts } from '@skmtc/core'
import { toDocumentObject } from '@skmtc/test-support'
import { kotlinJacksonEntry } from '../src/mod.ts'
import { toMemberTag } from '../src/sealedMembership.ts'

Deno.test('toMemberTag - two members that share a refName each take their own tag', () => {
  const a = '#/components/schemas/A/properties/disk'
  const b = '#/components/schemas/B/properties/disk'

  assertEquals([a, b].map($ref => toMemberTag(toRefParts({ $ref }), { a, b })), ['a', 'b'])
})

Deno.test('a name enrichment names a component, and frees its default name for a synthesized sibling', () => {
  const document = toDocumentObject({
    openapi: '3.1.0',
    info: { title: 'Refs', version: '1' },
    paths: {},
    components: {
      schemas: {
        // The inline `metadata` is synthesized as `OrderMetadata`, the component's default name.
        Order: { type: 'object', properties: { metadata: { type: 'object', properties: { a: { type: 'string' } } } } },
        OrderMetadata: { type: 'object', properties: { b: { type: 'string' } } }
      }
    }
  }, 'refs')

  const run = (enrichments: Record<string, unknown>) =>
    toArtifacts({
      traceId: 'gen-kotlin-jackson-name',
      spanId: 'run',
      startAt: Date.now(),
      document: { type: 'oas', value: document },
      settings: {
        basePath: './src',
        enrichments: { '@skmtc/gen-kotlin-jackson': { _generator: { basePackage: 'com.acme' }, ...enrichments } }
      },
      stackTrail: new StackTrail([]),
      silent: true,
      // @ts-expect-error - the map is generic over the enrichment type; one entry is not
      toGeneratorConfigMap: () => ({ '@skmtc/gen-kotlin-jackson': kotlinJacksonEntry })
    }).artifacts

  assertEquals(run({}), {})

  const classes = Object.values(run({ OrderMetadata: { main: { name: 'StoredMetadata' } } })).join('\n')

  assertStringIncludes(classes, 'class OrderMetadata(')
  assertStringIncludes(classes, 'class StoredMetadata(')
})

const text = { type: 'string' }

type RunArgs = {
  schemas: Record<string, unknown>
  paths?: Record<string, unknown>
  roots?: Record<string, unknown>
}

const generate = ({ schemas, paths = {}, roots = {} }: RunArgs): string => {
  const { artifacts } = toArtifacts({
    traceId: 'gen-kotlin-jackson-ref-path',
    spanId: 'run',
    startAt: Date.now(),
    document: {
      type: 'oas',
      value: toDocumentObject(
        { openapi: '3.1.0', info: { title: 'Refs', version: '1' }, ...roots, paths, components: { schemas } },
        'refs'
      )
    },
    settings: {
      basePath: './src',
      enrichments: { '@skmtc/gen-kotlin-jackson': { _generator: { basePackage: 'com.acme' } } }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ '@skmtc/gen-kotlin-jackson': kotlinJacksonEntry })
  })

  return Object.values(artifacts).join('\n')
}

const toMember = (own: string) => ({
  type: 'object',
  required: ['kind', own],
  properties: { kind: text, [own]: text }
})

const petUnion = {
  oneOf: [{ $ref: '#/components/schemas/Dog' }, { $ref: '#/components/schemas/Cat' }],
  discriminator: { propertyName: 'kind' }
}

const members = { Dog: toMember('bark'), Cat: toMember('meow') }

/** The supertypes `name` declares. */
const toSupertypes = (kotlin: string, name: string): string[] =>
  (new RegExp(`class ${name}\\([^)]*\\)\\s*:\\s*([^\\n{]+)`).exec(kotlin)?.[1] ?? '').split(',').map(each => each.trim())

Deno.test('a deep ref to a sealed union in a property - its members declare it, and the inline union too', () => {
  const kotlin = generate({
    schemas: {
      ...members,
      H: { type: 'object', properties: { pet: petUnion } },
      V: { type: 'object', properties: { p: { $ref: '#/components/schemas/H/properties/pet' } } }
    }
  })

  assertStringIncludes(kotlin, 'sealed interface Pet')
  assertEquals(toSupertypes(kotlin, 'Dog').toSorted(), ['HPet', 'Pet'])
  assertEquals(toSupertypes(kotlin, 'Cat').toSorted(), ['HPet', 'Pet'])
})

Deno.test('a deep ref to a sealed union in $defs - its members declare it', () => {
  const kotlin = generate({
    schemas: {
      ...members,
      H: { type: 'object', properties: { id: text }, $defs: { pet: petUnion } },
      V: { type: 'object', properties: { p: { $ref: '#/components/schemas/H/$defs/pet' } } }
    }
  })

  assertStringIncludes(kotlin, 'sealed interface Pet')
  assertEquals(toSupertypes(kotlin, 'Dog'), ['Pet'])
})

Deno.test('a deep ref that only an operation holds - the parent its members declare is written', () => {
  const kotlin = generate({
    schemas: { ...members, H: { type: 'object', properties: { id: text }, $defs: { pet: petUnion } } },
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/H/$defs/pet' } } } }
          }
        }
      }
    }
  })

  assertStringIncludes(kotlin, 'sealed interface Pet')
  assertEquals(toSupertypes(kotlin, 'Dog'), ['Pet'])
})

Deno.test('an inline object in a target outside the components is named from its model', () => {
  const disk = { type: 'object', properties: { meta: { type: 'object', properties: { size: text } } } }
  const kotlin = generate({
    roots: { 'x-m': { Disk: disk } },
    schemas: { V: { type: 'object', properties: { d: { $ref: '#/x-m/Disk' } } } }
  })

  assertStringIncludes(kotlin, 'class Disk(')
  assertStringIncludes(kotlin, 'class DiskMeta(')
})

Deno.test('toMemberTag - a mapping value that is no pointer is matched by its last segment', () => {
  const member = toRefParts({ $ref: '#/components/schemas/Dog' })
  const values = ['Dog', './Dog', 'schemas/Dog', 'other.yaml#/components/schemas/Dog', '#/components/schemas/Dog']

  assertEquals(values.map(value => toMemberTag(member, { d: value })), values.map(() => 'd'))
})
