/**
 * A full Parse → Generate → Render run over a fixture schema, pinning whole
 * files byte-for-byte.
 *
 * This is the layer that covers what a value-level test structurally cannot:
 * the import header. A `$ref` renders as a bare identifier, so the only proof
 * that it resolves is the `import { … }` line the engine stitched in beside it.
 */
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import arktypeEntry from '@skmtc/gen-arktype'

export const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      // Scalars, a scalar array, a nested object, and a cross-file ref.
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          age: { type: 'integer' },
          active: { type: 'boolean' },
          status: { $ref: '#/components/schemas/Status' },
          tags: { type: 'array', items: { type: 'string' } },
          address: {
            type: 'object',
            properties: { street: { type: 'string' }, city: { type: 'string' } },
            required: ['street']
          }
        },
        required: ['id', 'status']
      },
      Status: { type: 'string', enum: ['active', 'inactive'] },
      // An array of objects — invalid in arktype's string syntax.
      Team: {
        type: 'object',
        properties: {
          members: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name']
          }
        },
        required: ['members']
      },
      Roster: { type: 'array', items: { $ref: '#/components/schemas/User' } },
      // A union of objects — likewise invalid as a string.
      Result: {
        oneOf: [
          { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
          { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] }
        ]
      },
      // additionalProperties, alone and beside declared properties.
      Bag: { type: 'object', additionalProperties: { type: 'number' } },
      Mixed: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: true
      },
      // A nullable ref, which cannot be spelled as a string either.
      Wrapper: {
        type: 'object',
        properties: { inner: { allOf: [{ $ref: '#/components/schemas/Status' }], nullable: true } },
        required: ['inner']
      }
    }
  }
}

export const runFixture = () => {
  return toArtifacts({
    traceId: 'gen-arktype-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './src' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-arktype': arktypeEntry
    })
  })
}

Deno.test('e2e - every model lands in its own file', () => {
  const { artifacts, manifest } = runFixture()

  assertEquals(Object.keys(artifacts).sort(), [
    'src/types/bag.generated.ts',
    'src/types/mixed.generated.ts',
    'src/types/result.generated.ts',
    'src/types/roster.generated.ts',
    'src/types/status.generated.ts',
    'src/types/team.generated.ts',
    'src/types/user.generated.ts',
    'src/types/wrapper.generated.ts'
  ])

  assertEquals(
    manifest.parseIssues.filter(issue => issue.level === 'error'),
    []
  )
})

Deno.test('e2e - a ref renders beside the import that resolves it', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['src/types/user.generated.ts'],
    `import {status} from '@/types/status.generated.ts'\nimport {type} from 'arktype'\n\n` +
      `export const user = type({ id: "string", "age?": "number", "active?": "boolean", ` +
      `status: status, "tags?": "string[]", "address?": { street: "string", "city?": "string" } });\n`
  )
})

Deno.test('e2e - arrays and unions of objects compose as values', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['src/types/roster.generated.ts'],
    `import {user} from '@/types/user.generated.ts'\nimport {type} from 'arktype'\n\n` +
      `export const roster = type([user, "[]"]);\n`
  )

  assertEquals(
    artifacts['src/types/result.generated.ts'],
    `import {type} from 'arktype'\n\n` +
      `export const result = type([{ ok: "boolean" }, "|", { error: "string" }]);\n`
  )
})

Deno.test('e2e - additionalProperties becomes an index signature', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['src/types/bag.generated.ts'],
    `import {type} from 'arktype'\n\nexport const bag = type({ "[string]": "number" });\n`
  )

  assertEquals(
    artifacts['src/types/mixed.generated.ts'],
    `import {type} from 'arktype'\n\n` +
      `export const mixed = type({ name: "string", "[string]": "unknown" });\n`
  )
})
