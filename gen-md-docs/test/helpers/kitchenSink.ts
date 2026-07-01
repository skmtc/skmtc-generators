import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { mdDocsEntry } from '../../src/mod.ts'

export const kitchenSinkBasePath = 'api'

/**
 * A deliberately exhaustive OpenAPI document — every shape and feature the
 * generator renders — used as the corpus for the invariant (Layer 1) and
 * coverage (Layer 2) tests and pinned as the golden output (Layer 3). Exercises:
 * the root path, an untagged operation, multiple tags, every parameter location,
 * a JSON and a binary request body, multiple responses incl. a no-content one,
 * a security scheme, `$ref`s, a recursive ref (cycle), a union, arrays of
 * scalar/object/ref, nested objects, and constraints/enums/defaults/nullable/
 * readOnly/deprecated.
 */
export const kitchenSinkDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Kitchen Sink API',
    version: '1.0.0',
    description: 'A deliberately exhaustive API used to exercise the docs generator.'
  },
  servers: [
    { url: 'https://api.example.com/v1', description: 'Production' },
    { url: 'https://staging.example.com/v1' }
  ],
  externalDocs: { url: 'https://docs.example.com', description: 'Full documentation' },
  tags: [
    {
      name: 'pets',
      description: 'Everything about pets.',
      externalDocs: { url: 'https://docs.example.com/pets' }
    },
    { name: 'store', description: 'Store and inventory operations.' }
  ],
  paths: {
    '/': {
      get: {
        tags: ['meta'],
        operationId: 'getRoot',
        summary: 'API root',
        responses: {
          '200': {
            description: 'Service metadata',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { version: { type: 'string' } } }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                  status: { type: 'string', enum: ['ok', 'degraded'], example: 'ok' }
                }
                }
              }
            }
          }
        }
      }
    },
    '/pets': {
      get: {
        tags: ['pets'],
        operationId: 'listPets',
        summary: 'List pets',
        description: 'Returns all pets, optionally filtered.',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum results',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'tags',
            in: 'query',
            deprecated: true,
            style: 'form',
            explode: false,
            schema: { type: 'array', items: { type: 'string' } }
          },
          {
            name: 'filter',
            in: 'query',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { color: { type: 'string' } } }
              }
            }
          },
          { name: 'X-Request-Id', in: 'header', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'A list of pets',
            headers: {
              'X-Total-Count': { description: 'Total number of pets', schema: { type: 'integer' } },
              'X-RateLimit-Remaining': { schema: { type: 'integer' } }
            },
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } }
              }
            }
          },
          '400': {
            description: 'Bad request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      },
      post: {
        tags: ['pets'],
        operationId: 'createPet',
        summary: 'Create a pet',
        security: [{ oauth2: ['pets:write'] }],
        requestBody: {
          required: true,
          description: 'The pet to create.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NewPet' } } }
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } }
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } }
            }
          },
          default: {
            description: 'Unexpected error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/pets/{petId}': {
      get: {
        tags: ['pets'],
        operationId: 'getPet',
        summary: 'Get a pet',
        externalDocs: { url: 'https://docs.example.com/pets/get', description: 'Retrieval guide' },
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            description: 'The pet identifier',
            schema: { type: 'string' }
          },
          { name: 'session', in: 'cookie', schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'The pet',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } }
          },
          '404': {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/pets/{petId}/photo': {
      put: {
        tags: ['pets'],
        operationId: 'uploadPhoto',
        summary: 'Upload a photo',
        parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } }
        },
        responses: { '204': { description: 'No content' } }
      }
    },
    '/store/inventory': {
      get: {
        tags: ['store'],
        operationId: 'getInventory',
        summary: 'Inventory levels',
        deprecated: true,
        responses: {
          '200': {
            description: 'Inventory counts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  title: 'Inventory',
                  minProperties: 1,
                  additionalProperties: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      apiKey: { type: 'apiKey', name: 'X-API-Key', in: 'header', description: 'A project API key.' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      oauth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: { 'pets:read': 'Read pets', 'pets:write': 'Create and update pets' }
          }
        }
      }
    },
    schemas: {
      Pet: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer', format: 'int64', readOnly: true },
          name: { type: 'string', minLength: 1, maxLength: 50 },
          status: { type: 'string', enum: ['active', 'inactive'], default: 'active' },
          tags: { type: 'array', items: { type: 'string' } },
          category: { $ref: '#/components/schemas/Category' },
          friends: { type: 'array', items: { $ref: '#/components/schemas/Pet' } }
        }
      },
      Category: {
        type: 'object',
        title: 'Pet category',
        properties: { id: { type: 'integer' }, name: { type: 'string' } }
      },
      NewPet: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          status: { type: 'string', enum: ['active', 'inactive'] },
          category: { $ref: '#/components/schemas/Category' },
          photoUrls: { type: 'array', items: { type: 'string', format: 'uri' }, minItems: 1 },
          metadata: { oneOf: [{ type: 'string' }, { type: 'integer' }] }
        }
      },
      Error: {
        type: 'object',
        required: ['code', 'message'],
        properties: { code: { type: 'integer' }, message: { type: 'string' } }
      },
      ValidationError: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } }
            }
          }
        }
      }
    }
  }
}

/** Run the generator over the kitchen-sink document. */
export const runKitchenSink = () =>
  toArtifacts({
    traceId: 'kitchen-sink',
    spanId: 'run',
    startAt: Date.now(),
    document: { type: 'oas', value: kitchenSinkDocument },
    settings: { basePath: kitchenSinkBasePath },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-md-docs': mdDocsEntry
    })
  })
