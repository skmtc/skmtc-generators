/**
 * A full Parse → Generate → Render run over a fixture schema, pinning whole
 * files byte-for-byte.
 *
 * This is the layer that covers what a value-level test structurally cannot:
 * the import header. A `$ref` renders as a bare identifier, so the only proof
 * that it resolves is the `import { … }` line the engine stitched in beside it.
 */
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
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
