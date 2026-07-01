/**
 * End-to-end gate: a full Parse → Generate → Render run over a fixture schema
 * through the real pipeline, pinning the generated Markdown byte-for-byte.
 */
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { mdDocsEntry } from '../src/mod.ts'

const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {
    '/pets/{id}': {
      get: {
        summary: 'Get pet by ID',
        description: 'Returns a single pet.',
        tags: ['pets'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'The pet identifier',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'A pet',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { id: { type: 'integer' }, name: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  }
}

const runFixture = () =>
  toArtifacts({
    traceId: 'gen-md-docs-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './src' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-md-docs': mdDocsEntry
    })
  })

Deno.test('e2e - generates one Markdown file per operation, no parse errors', () => {
  const { artifacts, manifest } = runFixture()

  assertEquals(Object.keys(artifacts), [
    'src/docs/pets/pets-id-GET.md',
    'src/docs/index.md',
    'src/docs/index.json',
    'src/docs/pets/index.md'
  ])
  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
})

Deno.test('e2e - accumulates the top index, a per-tag index and the JSON catalog', () => {
  const { artifacts } = runFixture()

  // Top index: a lightweight tag directory.
  assertEquals(
    artifacts['src/docs/index.md'],
    [
      '# Fixture API',
      '> Reference for 1 operation, grouped by tag.',
      '- [pets](pets/index.md) — 1 operation'
    ].join('\n\n')
  )

  // Per-tag index: the tag's operations, linked within the folder.
  assertEquals(
    artifacts['src/docs/pets/index.md'],
    ['# pets', '- [Get pet by ID](pets-id-GET.md) — `GET` `/pets/{id}`'].join('\n\n')
  )

  // Catalog: one structured record per operation.
  assertEquals(
    artifacts['src/docs/index.json'],
    JSON.stringify(
      {
        title: 'Fixture API',
        operations: [
          {
            method: 'GET',
            path: '/pets/{id}',
            tags: ['pets'],
            summary: 'Get pet by ID',
            file: 'pets/pets-id-GET.md'
          }
        ]
      },
      null,
      2
    )
  )
})

Deno.test('e2e - the operation document renders the composed Markdown', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['src/docs/pets/pets-id-GET.md'],
    [
      '---\ntype: operation\ntitle: "Get pet by ID"\nmethod: GET\npath: "/pets/{id}"\ntags:\n  - "pets"\n---',
      '# Get pet by ID',
      'Returns a single pet.',
      '`GET` `/pets/{id}`',
      '## Path parameters',
      '**id** `string` required — The pet identifier',
      '## Responses',
      '### `200` — A pet',
      '`object`\n- **id** `integer`\n- **name** `string`'
    ].join('\n\n')
  )
})
