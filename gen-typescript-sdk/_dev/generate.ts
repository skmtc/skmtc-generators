// Dev harness: run gen-typescript-sdk over a minimal `models` OpenAPI slice
// and write the artifacts to _dev/out/, for a Prettier-normalised diff
// against openai-node/src/resources/models.ts.
//
//   deno run --allow-all _dev/generate.ts

import { toArtifacts, StackTrail } from '@skmtc/core'
import { join, dirname, fromFileUrl } from '@std/path'
import sdkEntry from '../mod.ts'

const here = dirname(fromFileUrl(import.meta.url))
const outDir = join(here, 'out')

const modelSchema = {
  type: 'object',
  title: 'Model',
  description: 'Describes an OpenAI model offering that can be used with the API.',
  properties: {
    id: { type: 'string', description: 'The model identifier, which can be referenced in the API endpoints.' },
    created: { type: 'integer', format: 'unixtime', description: 'The Unix timestamp (in seconds) when the model was created.' },
    object: { type: 'string', enum: ['model'], description: 'The object type, which is always "model".' },
    owned_by: { type: 'string', description: 'The organization that owns the model.' }
  },
  required: ['id', 'object', 'created', 'owned_by']
}

const openApiDocument = {
  openapi: '3.0.0',
  info: { title: 'OpenAI API', version: '2.3.0' },
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    schemas: {
      Model: modelSchema,
      ListModelsResponse: {
        type: 'object',
        properties: {
          object: { type: 'string', enum: ['list'] },
          data: { type: 'array', items: { $ref: '#/components/schemas/Model' } }
        },
        required: ['object', 'data']
      },
      DeleteModelResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deleted: { type: 'boolean' },
          object: { type: 'string' }
        },
        required: ['id', 'object', 'deleted']
      }
    }
  },
  paths: {
    '/models': {
      get: {
        operationId: 'listModels',
        tags: ['Models'],
        description: 'Lists the currently available models, and provides basic information about each one such as the owner and availability.',
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/ListModelsResponse' } } } }
        }
      }
    },
    '/models/{model}': {
      get: {
        operationId: 'retrieveModel',
        tags: ['Models'],
        description: 'Retrieves a model instance, providing basic information about the model such as the owner and permissioning.',
        parameters: [{ in: 'path', name: 'model', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Model' } } } }
        }
      },
      delete: {
        operationId: 'deleteModel',
        tags: ['Models'],
        description: 'Delete a fine-tuned model. You must have the Owner role in your organization to delete a model.',
        parameters: [{ in: 'path', name: 'model', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteModelResponse' } } } }
        }
      }
    }
  }
}

const enrichments = {
  '@skmtc/gen-typescript-sdk': {
    _generator: {
      clientName: 'OpenAI',
      schemaNames: { DeleteModelResponse: 'ModelDeleted' },
      fileHeader: '// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.'
    },
    '/models': {
      get: { main: { resource: 'models', methodName: 'list', resourceDescription: 'List and describe the various models available in the API.' } }
    },
    '/models/{model}': {
      get: { main: { resource: 'models', methodName: 'retrieve' } },
      delete: { main: { resource: 'models', methodName: 'delete' } }
    }
  }
}

const { artifacts, manifest } = toArtifacts({
  traceId: 'sdk-dev',
  spanId: 'sdk-dev',
  document: { type: 'oas', value: openApiDocument },
  // deno-lint-ignore no-explicit-any
  settings: { basePath: outDir, enrichments } as any,
  toGeneratorConfigMap: () => ({ '@skmtc/gen-typescript-sdk': sdkEntry }) as never,
  startAt: Date.now(),
  silent: true,
  stackTrail: new StackTrail(['sdk-dev'])
})

for (const [path, content] of Object.entries(artifacts)) {
  await Deno.mkdir(dirname(path), { recursive: true })
  await Deno.writeTextFile(path, content)
  console.log(`wrote ${path}`)
}

const errored = Object.entries(manifest.results ?? {})
console.log(`\nfiles: ${Object.keys(artifacts).length}`)
if (manifest.parseIssues?.length) {
  console.log('parseIssues:', JSON.stringify(manifest.parseIssues, null, 2))
}
if (!Object.keys(artifacts).length) {
  console.log('NO ARTIFACTS — results:', JSON.stringify(errored, null, 2))
}
