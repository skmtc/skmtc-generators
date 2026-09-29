import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { document, runStack } from './fixture.ts'

const count = (text: string, fragment: string): number => text.split(fragment).length - 1

Deno.test('e2e - with one exportPath, the stack writes one file that imports only zod', () => {
  const { artifacts } = runStack({ document, exportPath: '@/operation.ts' })

  assertEquals(Object.keys(artifacts), ['src/operation.generated.ts'])

  const [content] = Object.values(artifacts)
  const imports = content.split('\n').filter(line => line.startsWith('import '))

  assertEquals(imports, [`import {z} from 'zod'`])
})

Deno.test('e2e - a model used by two operations is defined once', () => {
  const { artifacts } = runStack({ document, exportPath: '@/operation.ts' })
  const content = artifacts['src/operation.generated.ts']

  assertEquals(count(content, 'export const user = '), 1)
  assertEquals(count(content, 'export type User = '), 1)
  assertEquals(count(content, 'export class ApiError '), 1)
})

Deno.test('e2e - a schema name that starts with a digit gets a different prefix from each model generator', () => {
  const { artifacts } = runStack({ document, exportPath: '@/operation.ts' })
  const content = artifacts['src/operation.generated.ts']

  assertStringIncludes(content, 'export type Type429 = ')
  assertStringIncludes(content, 'export const schema429 = ')
})

Deno.test('e2e - without exportPath, each generator keeps its own files', () => {
  const { artifacts } = runStack({ document })

  assert(Object.keys(artifacts).includes('src/fetch/getApiPrice.generated.ts'))
  assert(Object.keys(artifacts).includes('src/types/user.generated.ts'))
  assertStringIncludes(artifacts['src/fetch/getApiPrice.generated.ts'], `import {timeSeries} from '@/types/timeSeries.generated.ts'`)
})

Deno.test('e2e - the request line, parameters and auth come from the document', () => {
  const { artifacts } = runStack({ document, exportPath: '@/operation.ts' })
  const content = artifacts['src/operation.generated.ts']

  // Server variables take their defaults; the trailing slash is dropped.
  assertStringIncludes(content, `baseUrl = "https://eu.example.com/v1"`)
  assertStringIncludes(content, '/users/${encodeURIComponent(String(args["user-id"]))}')
  assertStringIncludes(content, `if (args["X-Request-Id"] != null) headers.set("X-Request-Id", String(args["X-Request-Id"]))`)
  assertStringIncludes(content, 'body: JSON.stringify(args.body)')
  // The document's bearer requirement applies to PUT; DELETE overrides it with alternatives.
  assertStringIncludes(content, "headers.set('authorization', `Bearer ${options.token}`)")
  assertStringIncludes(content, `if (options.apiKey !== undefined) headers.set("X-API-Key", options.apiKey)`)
  assertStringIncludes(content, 'Also accepts auth: bearerAuth')
  assertStringIncludes(content, 'return timeSeries.parse(await res.json())')
})

Deno.test("e2e - the error class steps aside for a schema named ApiError", () => {
  const withApiError = {
    ...document,
    components: {
      ...document.components,
      schemas: { ...document.components?.schemas, ApiError: { type: 'object', properties: { code: { type: 'string' } } } }
    }
  } satisfies typeof document

  const { artifacts } = runStack({ document: withApiError, exportPath: '@/operation.ts' })
  const content = artifacts['src/operation.generated.ts']

  assertStringIncludes(content, 'export class ApiError2 extends Error')
  assertStringIncludes(content, 'throw new ApiError2(res.status')
})

Deno.test('e2e - a document with no absolute server makes baseUrl required', () => {
  const { artifacts } = runStack({ document: { ...document, servers: [{ url: '/api' }] }, exportPath: '@/operation.ts' })
  const content = artifacts['src/operation.generated.ts']

  assertStringIncludes(content, '  baseUrl: string\n')
  assertStringIncludes(content, 'options: GetApiPriceOptions) =>')
})
