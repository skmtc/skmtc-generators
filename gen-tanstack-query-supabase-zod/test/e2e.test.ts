/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { assertNoResultErrors, listDocument, operationDocument, runE2eFixture } from '@skmtc/test-support'
import { tanstackQueryEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-tanstack-query-supabase-zod',
  entry: tanstackQueryEntry,
  document: operationDocument
})

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  assertEquals(Object.keys(artifacts).sort(), [
    'src/services/useCreateApiUsers.generated.ts',
    'src/services/useGetApiUsers.generated.ts',
    'src/types/newUser.generated.ts',
    'src/types/user.generated.ts'
  ])
})

Deno.test('e2e - generated imports name workspace paths with forward slashes', () => {
  assertStringIncludes(
    artifacts['src/services/useGetApiUsers.generated.ts'],
    `import {user} from '@/types/user.generated.ts'\n`
  )
})

// #121: only a list of objects is paginated. A list of strings, or an object
// with an array of strings, gets a plain query.
Deno.test('e2e - an operation whose list items are not objects renders a plain query', () => {
  const { artifacts: listArtifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-tanstack-query-supabase-zod',
    entry: tanstackQueryEntry,
    document: listDocument
  })

  assertNoResultErrors(manifest)
  assertEquals(
    Object.entries(listArtifacts)
      .filter(([path]) => path.startsWith('src/services/'))
      .map(([path, content]) => [path, content.includes('keepPreviousData')])
      .sort(),
    [
      ['src/services/useGetApiTags.generated.ts', false],
      ['src/services/useGetApiUsers.generated.ts', true],
      ['src/services/useGetApiUsersId.generated.ts', false]
    ]
  )
})
