/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { operationDocument, runE2eFixture } from '@skmtc/test-support'
import { tanstackQueryEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-tanstack-query-fetch-zod',
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

// The trap: a tag written into quotes by hand ends the string at its own
// quote, and the generated query key does not parse.
Deno.test("e2e - an operation tag with a quote is escaped in the query key", () => {
  const { paths } = operationDocument
  const users = paths['/users']
  const get = users?.get

  if (!get) {
    throw new Error('operationDocument has no GET /users')
  }

  const tagged = runE2eFixture({
    id: '@skmtc/gen-tanstack-query-fetch-zod',
    entry: tanstackQueryEntry,
    document: { ...operationDocument, paths: { ...paths, '/users': { ...users, get: { ...get, tags: ["Partner's users"] } } } }
  })

  assertStringIncludes(tagged.artifacts['src/services/useGetApiUsers.generated.ts'], "'Partner\\'s users'")
})
