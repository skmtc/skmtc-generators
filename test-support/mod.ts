/**
 * Shared end-to-end fixtures for the generators' tests: small documents, one
 * Parse → Generate → Render run over them, and checks on the run's results.
 *
 * Private and never published — the release script skips `private: true`
 * members — so it holds test code only.
 */
import { assert, assertEquals } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { ResultsItem, ResultType } from '@skmtc/core'
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

const isDocumentObject = (value: unknown): value is OpenAPIV3.Document =>
  typeof value === 'object' && value !== null && 'openapi' in value && 'info' in value

/**
 * Narrow a 3.2 document to `OpenAPIV3.Document`. The `openapi-types` path
 * item has no `query` key and its example has no `dataValue`.
 */
export const toDocumentObject = (value: unknown, name: string): OpenAPIV3.Document => {
  assert(isDocumentObject(value), `${name} is not an OpenAPI document`)
  return value
}

/** A `head` and a `trace` operation, which some route frameworks have no method for. */
export const headTraceDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {
    '/ping': {
      head: { responses: { '204': { description: 'Alive' } } },
      trace: { responses: { '200': { description: 'The echoed request' } } }
    }
  }
}

/** A 3.2 document with one `query` operation and nothing else. */
export const queryDocument: OpenAPIV3.Document = toDocumentObject(
  {
    openapi: '3.2.0',
    info: { title: 'Fixture API', version: '1.0.0' },
    paths: {
      '/users/search': {
        query: {
          tags: ['users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string' } } }
              }
            }
          },
          responses: {
            '200': {
              description: 'The matching users',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  },
  'queryDocument'
)

/** A 3.2 document whose one response example carries a `dataValue`. */
export const dataValueDocument: OpenAPIV3.Document = toDocumentObject(
  {
    openapi: '3.2.0',
    info: { title: 'Fixture API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          responses: {
            '200': {
              description: 'Every user',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                  examples: {
                    first: { dataValue: ['Ada Lovelace'] }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'dataValueDocument'
)

/** A 3.2 document whose one response example carries only a `serializedValue`. */
export const serializedValueDocument: OpenAPIV3.Document = toDocumentObject(
  {
    openapi: '3.2.0',
    info: { title: 'Fixture API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          responses: {
            '200': {
              description: 'Every user',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                  examples: {
                    first: { serializedValue: '["Grace Hopper"]' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'serializedValueDocument'
)

type RunE2eFixtureArgs = {
  /** The generator's package name, which keys it in the config map. */
  id: string
  entry: GeneratorEntry
  document: OpenAPIV3.Document
}

/** Run one generator over `document` with `basePath: './src'`. */
export const runE2eFixture = ({ id, entry, document }: RunE2eFixtureArgs): ReturnType<typeof toArtifacts> =>
  toArtifacts({
    traceId: `${id}-e2e`,
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: { basePath: './src' },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ [id]: entry })
  })

/**
 * Every `ResultType` leaf in a manifest's results tree — the VALUES
 * only. The tree's keys are subject paths (`/error-logs:get`) and
 * destination paths (`ApiError.generated.kt`), so matching a substring
 * against the serialized tree reports an error for any document whose
 * own names contain one.
 */
export const toResultTypes = (results: ResultsItem): ResultType[] => {
  return Object.values(results).flatMap(value => {
    if (value === null) {
      return []
    }

    if (typeof value === 'string') {
      return [value]
    }

    if (Array.isArray(value)) {
      return value.flatMap(item => (item === null ? [] : toResultTypes(item)))
    }

    return toResultTypes(value)
  })
}

/**
 * A generate-phase throw never touches `parseIssues` — it lands in
 * `manifest.results.generate` as a per-subject `error`, while the
 * accumulator's already-registered container still renders a
 * valid-but-empty file. Every fixture asserts BOTH channels.
 */
export const assertNoResultErrors = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).filter(result => result === 'error'), [])
}

/** The inverse gate: a run that MUST fail its subjects. */
export const assertHasResultError = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).includes('error'), true)
}
