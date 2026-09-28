/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals } from '@std/assert'
import { operationDocument, runE2eFixture } from '@skmtc/test-support'
import { fetchEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-fetch-example',
  entry: fetchEntry,
  document: operationDocument
})

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  assertEquals(Object.keys(artifacts).sort(), [
    'src/fetch/createApiUsers.generated.ts',
    'src/fetch/getApiUsers.generated.ts'
  ])
})

// The generated functions import nothing, so each file is pinned whole.
Deno.test('e2e - the GET operation renders a fetch function', () => {
  assertEquals(
    artifacts['src/fetch/getApiUsers.generated.ts'],
    "export const getApiUsers = async () => {\n  const res = await fetch('/users', { method: 'GET' })\n\n  return res.json()\n};\n"
  )
})

Deno.test('e2e - the POST operation renders a fetch function that sends the body', () => {
  assertEquals(
    artifacts['src/fetch/createApiUsers.generated.ts'],
    "export const createApiUsers = async (body: unknown) => {\n  const res = await fetch('/users', { method: 'POST', body: JSON.stringify(body) })\n\n  return res.json()\n};\n"
  )
})
