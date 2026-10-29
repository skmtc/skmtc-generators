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
  nullExampleDocument,
  operationDocument,
  queryDocument,
  runE2eFixture,
  serializedValueDocument,
  toMediaTypeDocument
} from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
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

Deno.test('e2e - the handler returns an explicit null example', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-msw',
    entry: MswEntry,
    document: nullExampleDocument
  })

  assertStringIncludes(artifacts['src/mocks/handlers.generated.ts'], 'HttpResponse.json(null)')
})

const userSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: { name: { type: 'string', example: 'Ada Lovelace' } },
  required: ['name']
}

const toHandlers = (mediaType: string, mediaTypeObject: OpenAPIV3.MediaTypeObject): string => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-msw',
    entry: MswEntry,
    document: toMediaTypeDocument(mediaType, mediaTypeObject)
  })

  assertNoResultErrors(manifest)

  return artifacts['src/mocks/handlers.generated.ts']
}

Deno.test('e2e - an application/vnd.api+json response gets its example and Content-Type', () => {
  const handlers = toHandlers('application/vnd.api+json', {
    schema: userSchema,
    examples: { first: { value: { name: 'Grace Hopper' } } }
  })

  assertStringIncludes(handlers, 'http.get<never, never, {name: string}>')
  assertStringIncludes(handlers, '"Grace Hopper"')
  assertStringIncludes(handlers, `, { headers: { 'Content-Type': "application/vnd.api+json" } })`)
})

Deno.test('e2e - an application/json;v=1.0 response gets collated data and its Content-Type', () => {
  const handlers = toHandlers('application/json;v=1.0', { schema: userSchema })

  assertStringIncludes(handlers, 'http.get<never, never, {name: string}>')
  assertStringIncludes(handlers, '"Ada Lovelace"')
  assertStringIncludes(handlers, `'Content-Type': "application/json;v=1.0"`)
})

Deno.test('e2e - a */* response with an object schema is read as JSON, with no Content-Type', () => {
  const handlers = toHandlers('*/*', { schema: userSchema })

  assertStringIncludes(handlers, 'http.get<never, never, {name: string}>')
  assertStringIncludes(handlers, '"Ada Lovelace"')
  assertEquals(handlers.includes('Content-Type'), false)
})

Deno.test('e2e - a */* response with a string schema is still never', () => {
  const handlers = toHandlers('*/*', { schema: { type: 'string' } })

  assertStringIncludes(handlers, 'http.get<never, never, never>')
  assertStringIncludes(handlers, 'HttpResponse.json(undefined)')
})

Deno.test('e2e - an application/json response sends no Content-Type of its own', () => {
  const handlers = toHandlers('application/json', { schema: userSchema })

  assertStringIncludes(
    handlers,
    `http.get<never, never, {name: string}>('/users', () => {
  return HttpResponse.json({
  "name": "Ada Lovelace"
})
})`
  )
})
