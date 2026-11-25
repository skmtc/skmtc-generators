/**
 * Refs that do not point at a component (skmtc/skmtc#387). Models are named
 * from `ref.refName` by default, so two targets that share one collide until
 * a `name` enrichment names one of them.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import { runE2eFixture, toDocumentObject } from '@skmtc/test-support'
import { zodEntry } from '../src/mod.ts'

const text = { type: 'string' }

const toSchemasDocument = (schemas: Record<string, unknown>) =>
  toDocumentObject({ openapi: '3.1.0', info: { title: 'Refs', version: '1' }, paths: {}, components: { schemas } }, 'refs')

Deno.test('a ref into $defs generates a model named from refName', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-zod',
    entry: zodEntry,
    document: toSchemasDocument({
      Shared: { type: 'object', $defs: { schema0: { type: 'object', properties: { id: text } } } },
      Input: { type: 'object', properties: { value: { $ref: '#/components/schemas/Shared/$defs/schema0' } } }
    })
  })

  assertEquals('src/types/schema0.generated.ts' in artifacts, true)
  assertStringIncludes(artifacts['src/types/input.generated.ts'], `from '@/types/schema0.generated.ts'`)
})

const toOwner = (own: string) => ({
  type: 'object',
  properties: { disk: { type: 'object', properties: { [own]: text } } }
})

const disks = toSchemasDocument({
  A: toOwner('a'),
  B: toOwner('b'),
  Disks: {
    type: 'object',
    properties: {
      first: { $ref: '#/components/schemas/A/properties/disk' },
      second: { $ref: '#/components/schemas/B/properties/disk' }
    }
  }
})

const run = (document: ReturnType<typeof toSchemasDocument>, enrichments?: Record<string, unknown>) =>
  toArtifacts({
    traceId: 'gen-zod-ref-path',
    spanId: 'run',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: { basePath: './src', enrichments: { '@skmtc/gen-zod': enrichments ?? {} } },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ '@skmtc/gen-zod': zodEntry })
  })

Deno.test('two deep targets that share a refName fail the run by default', () => {
  const { artifacts, manifest } = run(disks)

  assertEquals(artifacts, {})
  assertStringIncludes(JSON.stringify(manifest.parseIssues), 'Registered definition mismatch')
})

Deno.test('a name enrichment on one of them, keyed by its pointer, keeps them apart', () => {
  const { artifacts } = run(disks, { '#/components/schemas/B/properties/disk': { main: { name: 'webServiceDisk' } } })

  assertStringIncludes(artifacts['src/types/disk.generated.ts'], 'export const disk')
  assertStringIncludes(artifacts['src/types/webServiceDisk.generated.ts'], 'export const webServiceDisk')
  assertStringIncludes(artifacts['src/types/disks.generated.ts'], `from '@/types/webServiceDisk.generated.ts'`)
})

Deno.test('a name enrichment keeps apart two components whose names differ only in case', () => {
  const document = toSchemasDocument({ pet: toOwner('a'), Pet: toOwner('b') })

  assertEquals(run(document).artifacts, {})
  assertEquals(Object.keys(run(document, { Pet: { main: { name: 'upperPet' } } }).artifacts).sort(), [
    'src/types/pet.generated.ts',
    'src/types/upperPet.generated.ts'
  ])
})

Deno.test('a name enrichment that is not an identifier fails the run and says so', () => {
  const { artifacts, manifest } = run(disks, { Disks: { main: { name: 'not-valid' } } })

  assertEquals(artifacts, {})
  assertStringIncludes(JSON.stringify(manifest.parseIssues), `name 'not-valid' is not a valid identifier`)
})

Deno.test('a recursive model takes a name under gen-zod, and its type one under gen-typescript', () => {
  const toRecursive = (name: string) => ({
    type: 'object',
    properties: { node: { type: 'array', items: { $ref: `#/components/schemas/${name}/properties/node` } } }
  })
  const document = toSchemasDocument({
    A: toRecursive('A'),
    B: toRecursive('B'),
    V: {
      type: 'object',
      properties: {
        a: { $ref: '#/components/schemas/A/properties/node' },
        b: { $ref: '#/components/schemas/B/properties/node' }
      }
    }
  })
  const pointer = '#/components/schemas/B/properties/node'

  const { artifacts, manifest } = toArtifacts({
    traceId: 'gen-zod-recursive-name',
    spanId: 'run',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: {
      basePath: './src',
      enrichments: {
        '@skmtc/gen-zod': { [pointer]: { main: { name: 'bNode' } } },
        '@skmtc/gen-typescript': { [pointer]: { main: { name: 'BNode' } } }
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ '@skmtc/gen-zod': zodEntry })
  })

  assertEquals(manifest.enrichmentWarnings, [])
  assertStringIncludes(artifacts['src/types/bNode.generated.ts'], 'z.ZodType<BNode>')
})
