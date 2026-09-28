/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { operationDocument, runE2eFixture } from '@skmtc/test-support'
import { ShadcnTableEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-shadcn-table',
  entry: ShadcnTableEntry,
  document: operationDocument
})

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  assertEquals(Object.keys(artifacts).sort(), [
    'src/services/useGetApiUsers.generated.ts',
    'src/tables/UsersTable.generated.tsx',
    'src/types/user.generated.ts'
  ])
})

Deno.test('e2e - generated imports name workspace paths with forward slashes', () => {
  assertStringIncludes(
    artifacts['src/tables/UsersTable.generated.tsx'],
    `import {useGetApiUsers} from '@/services/useGetApiUsers.generated.ts'\n`
  )
})
