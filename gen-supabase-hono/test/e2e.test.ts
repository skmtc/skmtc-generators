/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  assertNoResultErrors,
  headTraceDocument,
  operationDocument,
  queryDocument,
  runE2eFixture
} from '@skmtc/test-support'
import { supabaseHonoEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-supabase-hono',
  entry: supabaseHonoEntry,
  document: operationDocument
})

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  assertEquals(Object.keys(artifacts).sort(), [
    'src/types/newUser.generated.ts',
    'src/users/api.generated.ts'
  ])
})

Deno.test('e2e - generated imports name workspace paths with forward slashes', () => {
  assertStringIncludes(
    artifacts['src/users/api.generated.ts'],
    `import {newUser} from '@/types/newUser.generated.ts'\n`
  )
})

Deno.test('e2e - a 3.2 query operation gives no artifact and no error', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-supabase-hono',
    entry: supabaseHonoEntry,
    document: queryDocument
  })

  assertEquals(Object.keys(artifacts), [])
  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
  assertNoResultErrors(manifest)
})

Deno.test('e2e - head and trace operations give no artifact, since Hono has no app.head or app.trace', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-supabase-hono',
    entry: supabaseHonoEntry,
    document: headTraceDocument
  })

  assertEquals(Object.keys(artifacts), [])
  assertNoResultErrors(manifest)
})
