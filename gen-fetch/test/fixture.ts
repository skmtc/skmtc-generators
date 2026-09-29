import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import zodEntry from '@skmtc/gen-zod'
import typescriptEntry from '@skmtc/gen-typescript'
import { fetchEntry } from '../src/mod.ts'

/** An operation of each shape gen-fetch handles: query, path, header, body, auth, no content. */
export const document: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  servers: [{ url: 'https://{region}.example.com/v1/', variables: { region: { default: 'eu' } } }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/price': {
      get: {
        summary: 'Day-ahead spot market price',
        security: [],
        parameters: [
          { name: 'bzn', in: 'query', schema: { type: 'string', enum: ['DE-LU', 'AT'] } },
          { name: 'hours', in: 'query', explode: true, schema: { type: 'array', items: { type: 'integer' } } }
        ],
        responses: {
          '200': {
            description: 'Prices',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeSeries' } } }
          }
        }
      }
    },
    '/users/{user-id}': {
      put: {
        parameters: [
          { name: 'user-id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-Request-Id', in: 'header', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
        },
        responses: {
          '200': {
            description: 'The user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
          }
        }
      },
      delete: {
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'user-id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Deleted' } }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
    },
    schemas: {
      TimeSeries: {
        type: 'object',
        properties: {
          unix_seconds: { type: 'array', items: { type: 'integer' } },
          price: { type: 'array', items: { type: 'number', nullable: true } }
        },
        required: ['unix_seconds', 'price']
      },
      User: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' }, status: { $ref: '#/components/schemas/Status' } },
        required: ['id', 'name']
      },
      Status: { type: 'string', enum: ['active', 'inactive'] },
      // Recursive through a record: `Record<string, JsonValue>` would be TS2456.
      JsonValue: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { $ref: '#/components/schemas/JsonValue' } },
          { type: 'object', additionalProperties: { $ref: '#/components/schemas/JsonValue' } }
        ]
      },
      // Not an identifier; gen-typescript and gen-zod must still name it apart.
      '429': { type: 'object', properties: { message: { type: 'string' } } }
    }
  }
}

type RunArgs = {
  document: OpenAPIV3.Document
  exportPath?: string
}

/** The operation-code stack: gen-typescript, gen-zod and gen-fetch writing to one file. */
export const runStack = ({ document, exportPath }: RunArgs): ReturnType<typeof toArtifacts> => {
  const generator = exportPath ? { _generator: { exportPath } } : {}

  return toArtifacts({
    traceId: 'gen-fetch-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: {
      basePath: './src',
      enrichments: {
        '@skmtc/gen-typescript': generator,
        '@skmtc/gen-zod': generator,
        '@skmtc/gen-fetch': generator
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    // The map is generic over the enrichment type; each entry is monomorphic.
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - see above
      '@skmtc/gen-typescript': typescriptEntry,
      // @ts-expect-error - see above
      '@skmtc/gen-zod': zodEntry,
      // @ts-expect-error - see above
      '@skmtc/gen-fetch': fetchEntry
    })
  })
}
