/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  assertNoResultErrors,
  dataValueDocument,
  headTraceDocument,
  operationDocument,
  queryDocument,
  runE2eFixture,
  serializedValueDocument
} from '@skmtc/test-support'
import { MswEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-msw',
  entry: MswEntry,
  document: operationDocument
})

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  assertEquals(Object.keys(artifacts).sort(), [
    'src/mocks/handlers.generated.ts',
    'src/types/newUser.generated.ts',
    'src/types/user.generated.ts'
  ])
})

Deno.test('e2e - generated imports name workspace paths with forward slashes', () => {
  assertStringIncludes(
    artifacts['src/mocks/handlers.generated.ts'],
    `import type {User} from '@/types/user.generated.ts'\n`
  )
})

Deno.test('e2e - a 3.2 query operation gives no artifact and no error', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-msw',
    entry: MswEntry,
    document: queryDocument
  })

  assertEquals(Object.keys(artifacts), [])
  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
  assertNoResultErrors(manifest)
})

Deno.test('e2e - a trace operation gets no handler, since MSW has no http.trace', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-msw',
    entry: MswEntry,
    document: headTraceDocument
  })

  const handlers = artifacts['src/mocks/handlers.generated.ts']

  assertStringIncludes(handlers, 'http.head<')
  assertEquals(handlers.includes('http.trace'), false)
  assertNoResultErrors(manifest)
})

Deno.test('e2e - the handler returns the example dataValue', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-msw',
    entry: MswEntry,
    document: dataValueDocument
  })

  assertStringIncludes(artifacts['src/mocks/handlers.generated.ts'], '"Ada Lovelace"')
})

Deno.test('e2e - the handler returns the parsed example serializedValue', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-msw',
    entry: MswEntry,
    document: serializedValueDocument
  })

  assertStringIncludes(artifacts['src/mocks/handlers.generated.ts'], '"Grace Hopper"')
})
