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
