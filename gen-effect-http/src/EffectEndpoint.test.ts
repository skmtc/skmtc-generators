/**
 * Engine gate: the fixture runs through the REAL pipeline. It covers an
 * inline success response, a `$ref` body whose component must land as a
 * peer definition (once), path + query params, and a bodyless GET.
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { assertEquals, assertStringIncludes } from '@std/assert'
import effectHttpEntry from '../mod.ts'
import effectSchemaEntry from '@skmtc/gen-effect-schema'

const fixture = {
  openapi: '3.0.3',
  info: { title: 'Effect HTTP fixture', version: '0.0.1' },
  paths: {
    '/search': {
      post: {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SearchRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success'],
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        web: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/WebResult' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/accounts/{accountId}/d1/database/{databaseId}': {
      delete: {
        parameters: [
          {
            name: 'accountId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'databaseId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '204': { description: 'gone' } },
      },
    },
    '/accounts/{accountId}/d1/database': {
      get: {
        parameters: [
          {
            name: 'accountId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          {
            name: 'cf-r2-jurisdiction',
            in: 'header',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Database' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      SearchRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          limit: { type: 'integer' },
        },
      },
      WebResult: {
        type: 'object',
        required: ['url'],
        properties: { url: { type: 'string' }, title: { type: 'string' } },
      },
      Database: {
        type: 'object',
        required: ['uuid', 'name'],
        properties: { uuid: { type: 'string' }, name: { type: 'string' } },
      },
    },
  },
}

// The folders the two generators write to (each base.ts).
const ROOT = 'client-effect'
const MODELS = 'schema-effect'

const generate = () => {
  return toArtifacts({
    traceId: 'effect-http-test',
    spanId: 'effect-http-test',
    document: { type: 'oas', value: fixture as never },
    // gen-effect-schema's own entry skipped, so only the components an
    // endpoint reaches are emitted.
    settings: {
      basePath: '.',
      skip: [effectSchemaEntry.id],
    },
    stackTrail: new StackTrail(['effect-http', 'test']),
    toGeneratorConfigMap: (() => ({
      [effectHttpEntry.id]: effectHttpEntry,
      [effectSchemaEntry.id]: effectSchemaEntry,
    })) as Parameters<typeof toArtifacts>[0]['toGeneratorConfigMap'],
    startAt: Date.now(),
    silent: true,
  })
}

Deno.test('every endpoint renders to its own file, with only the components it reaches', () => {
  const { artifacts, manifest } = generate()

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)

  assertEquals(Object.keys(artifacts).toSorted(), [
    `${ROOT}/createApiSearch.generated.ts`,
    `${ROOT}/deleteApiAccountsAccountIdD1DatabaseDatabaseId.generated.ts`,
    `${ROOT}/getApiAccountsAccountIdD1Database.generated.ts`,
    `${ROOT}/index.generated.ts`,
    `${MODELS}/database.generated.ts`,
    `${MODELS}/index.generated.ts`,
    `${MODELS}/searchRequest.generated.ts`,
    `${MODELS}/webResult.generated.ts`,
  ])
})

Deno.test('the endpoint pins its render: an Effect over HttpClient, schemas co-located, refs imported', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts[`${ROOT}/createApiSearch.generated.ts`],
    `import {Schema, Effect} from 'effect'
import {SearchRequest} from '@/schema-effect/searchRequest.generated.ts'
import {WebResult} from '@/schema-effect/webResult.generated.ts'
import {HttpClient, HttpClientRequest, HttpClientResponse} from 'effect/unstable/http'

export const CreateApiSearchParams = Schema.Struct({});

export const CreateApiSearchResponse = Schema.Struct({success: Schema.Boolean, data: Schema.optional(Schema.Struct({web: Schema.optional(Schema.mutable(Schema.Array(WebResult)))}))});

export const createApiSearch = (body: typeof SearchRequest.Type) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = yield* HttpClientRequest.post("/search").pipe(
      HttpClientRequest.schemaBodyJson(SearchRequest)(body),
    );
    const response = yield* client.execute(request);
    return yield* HttpClientResponse.schemaBodyJson(CreateApiSearchResponse)(response);
  });
`,
  )
})

Deno.test('a GET takes params only: path interpolated, query and header set off params', () => {
  const { artifacts } = generate()

  const endpoint =
    artifacts[`${ROOT}/getApiAccountsAccountIdD1Database.generated.ts`]

  assertStringIncludes(
    endpoint,
    "export const GetApiAccountsAccountIdD1DatabaseParams = Schema.Struct({accountId: Schema.String, page: Schema.optional(Schema.Int), 'cf-r2-jurisdiction': Schema.optional(Schema.String)});",
  )
  assertStringIncludes(
    endpoint,
    'export const getApiAccountsAccountIdD1Database = (params: typeof GetApiAccountsAccountIdD1DatabaseParams.Type) =>',
  )
  assertStringIncludes(
    endpoint,
    'const request = HttpClientRequest.get(`/accounts/${params.accountId}/d1/database`).pipe(',
  )
  assertStringIncludes(
    endpoint,
    'HttpClientRequest.setUrlParams({page: params.page}),',
  )
  assertStringIncludes(
    endpoint,
    `HttpClientRequest.setHeaders({'cf-r2-jurisdiction': params['cf-r2-jurisdiction'] === undefined ? undefined : String(params['cf-r2-jurisdiction'])}),`,
  )
})

Deno.test('a DELETE with no response body is executed and not read', () => {
  const { artifacts } = generate()

  const endpoint = artifacts[
    `${ROOT}/deleteApiAccountsAccountIdD1DatabaseDatabaseId.generated.ts`
  ]

  assertStringIncludes(
    endpoint,
    `import {HttpClient, HttpClientRequest} from 'effect/unstable/http'`,
  )
  assertStringIncludes(
    endpoint,
    'const request = HttpClientRequest.delete(`/accounts/${params.accountId}/d1/database/${params.databaseId}`);',
  )
  assertStringIncludes(endpoint, '    yield* client.execute(request);\n  })')
  assertEquals(endpoint.includes('HttpClientResponse'), false)
  assertEquals(endpoint.includes('Response = '), false)
})

Deno.test('each barrel carries its own: endpoints with their co-located schemas, components in the schema folder', () => {
  const { artifacts } = generate()

  const barrel = artifacts[`${ROOT}/index.generated.ts`]

  // The inline params and response are named by the endpoint and
  // re-exported from its file; a `$ref` body is a model in gen-effect-schema's folder.
  assertStringIncludes(
    barrel,
    `{ createApiSearch, CreateApiSearchParams, CreateApiSearchResponse } from '@/client-effect/createApiSearch.generated.ts'`,
  )
  assertStringIncludes(
    barrel,
    `{ getApiAccountsAccountIdD1Database, GetApiAccountsAccountIdD1DatabaseParams, GetApiAccountsAccountIdD1DatabaseResponse } from '@/client-effect/getApiAccountsAccountIdD1Database.generated.ts'`,
  )
  assertEquals(barrel.includes('SearchRequest'), false)

  const models = artifacts[`${MODELS}/index.generated.ts`]

  assertStringIncludes(
    models,
    `{ SearchRequest } from '@/schema-effect/searchRequest.generated.ts'`,
  )
  assertStringIncludes(
    models,
    `{ Database } from '@/schema-effect/database.generated.ts'`,
  )
})
