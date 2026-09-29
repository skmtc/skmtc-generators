/**
 * Shared end-to-end fixtures for the generators' tests: two small documents
 * and one Parse → Generate → Render run over them.
 *
 * Private and never published — the release script skips `private: true`
 * members — so it holds test code only.
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'

type ToArtifactsArgs = Parameters<typeof toArtifacts>[0]

/** A generator entry, as `toArtifacts` expects it in the config map. */
export type GeneratorEntry = ReturnType<ToArtifactsArgs['toGeneratorConfigMap']>[string]

/** Two models with a cross-file ref, so the user file has to import the status file. */
export const modelDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { $ref: '#/components/schemas/Status' }
        },
        required: ['id', 'status']
      },
      Status: { type: 'string', enum: ['active', 'inactive'] }
    }
  }
}

/** A list and a create operation over two models. */
export const operationDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        responses: {
          '200': {
            description: 'Every user',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } }
              }
            }
          }
        }
      },
      post: {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NewUser' } } }
        },
        responses: {
          '201': {
            description: 'The created user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'name']
      },
      NewUser: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      }
    }
  }
}

type RunE2eFixtureArgs = {
  /** The generator's package name, which keys it in the config map. */
  id: string
  entry: GeneratorEntry
  document: OpenAPIV3.Document
  /** The generator's enrichments, as `client.json` would key them under its id. */
  enrichments?: Record<string, unknown>
}

/** Run one generator over `document` with `basePath: './src'`. */
export const runE2eFixture = ({ id, entry, document, enrichments }: RunE2eFixtureArgs): ReturnType<typeof toArtifacts> =>
  toArtifacts({
    traceId: `${id}-e2e`,
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: { basePath: './src', ...(enrichments ? { enrichments: { [id]: enrichments } } : {}) },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ [id]: entry })
  })
