/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { operationDocument, runE2eFixture } from '@skmtc/test-support'
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
