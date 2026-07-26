/**
 * The fixture every artifact-level test runs: one document covering each shape
 * the generator has to compose — scalars, a scalar array, an array of objects,
 * a union of objects, a nested object, `additionalProperties`, a cross-file
 * `$ref`, and a nullable `$ref`.
 *
 * It lives here rather than in a test file so that importing it does not
 * re-register that file's `Deno.test` cases under whichever task is running.
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import arktypeEntry from '@skmtc/gen-arktype'

export const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      // Scalars, a scalar array, a nested object, and a cross-file ref.
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          age: { type: 'integer' },
          active: { type: 'boolean' },
          status: { $ref: '#/components/schemas/Status' },
          tags: { type: 'array', items: { type: 'string' } },
          address: {
            type: 'object',
            properties: { street: { type: 'string' }, city: { type: 'string' } },
            required: ['street']
          }
        },
        required: ['id', 'status']
      },
      Status: { type: 'string', enum: ['active', 'inactive'] },
      // An array of objects — invalid in arktype's string syntax.
      Team: {
        type: 'object',
        properties: {
          members: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name']
          }
        },
        required: ['members']
      },
      Roster: { type: 'array', items: { $ref: '#/components/schemas/User' } },
      // A union of objects — likewise invalid as a string.
      Result: {
        oneOf: [
          { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
          { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] }
        ]
      },
      // additionalProperties, alone and beside declared properties.
      Bag: { type: 'object', additionalProperties: { type: 'number' } },
      Mixed: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: true
      },
      // A nullable ref, which cannot be spelled as a string either.
      Wrapper: {
        type: 'object',
        properties: { inner: { allOf: [{ $ref: '#/components/schemas/Status' }], nullable: true } },
        required: ['inner']
      }
    }
  }
}

export const runFixture = () => {
  return toArtifacts({
    traceId: 'gen-arktype-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './src' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-arktype': arktypeEntry
    })
  })
}
