/**
 * A full Parse → Generate → Render run over a fixture schema, pinning whole
 * files byte-for-byte.
 *
 * This is the layer that covers what a value-level test structurally cannot:
 * the import header. A `$ref` renders as a bare identifier, so the only proof
 * that it resolves is the `import { … }` line the engine stitched in beside it.
 */
import { assertEquals } from '@std/assert'
import { runE2eFixture, toResultTypes } from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
import { arktypeEntry } from '../src/mod.ts'
import { runFixture } from './helpers/fixture.ts'

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

// The trap: arktype removes a `\` it reads as an escape, so an optional key
// that ends in `\` and a required key that starts with `\[` have no
// spelling. Written as they are, arktype requires another key (`a?`,
// `[x]`) and rejects every object that has the real one. Each is left out,
// and the model's result is a warning.
Deno.test('e2e - a key arktype cannot spell is left out, with a warning', () => {
  const document: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: { title: 'Unspelled keys', version: '1.0.0' },
    paths: {},
    components: {
      schemas: {
        Unspelled: {
          type: 'object',
          required: ['id', '\\[x]'],
          properties: { id: { type: 'string' }, '\\[x]': { type: 'string' }, 'a\\': { type: 'string' } }
        }
      }
    }
  }

  const { artifacts, manifest } = runE2eFixture({ id: '@skmtc/gen-arktype', entry: arktypeEntry, document })

  assertEquals(
    artifacts['src/types/unspelled.generated.ts'],
    `import {type} from 'arktype'\n\nexport const unspelled = type({ id: "string" });\n`
  )
  // The model's generate result warns; its file still renders.
  assertEquals(toResultTypes(manifest.results), ['warning', 'success'])
})
