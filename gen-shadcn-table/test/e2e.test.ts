/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { assertNoResultErrors, listDocument, operationDocument, runE2eFixture } from '@skmtc/test-support'
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

// #121: a list of strings, or an object with an array of strings, failed the
// whole run with "Expected object type". Only a list of objects gets a table.
Deno.test('e2e - an operation whose list items are not objects is skipped', () => {
  const { artifacts: listArtifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-shadcn-table',
    entry: ShadcnTableEntry,
    document: listDocument
  })

  assertNoResultErrors(manifest)
  assertEquals(
    Object.keys(listArtifacts).filter(path => path.startsWith('src/tables/')),
    ['src/tables/UsersTable.generated.tsx']
  )
})
