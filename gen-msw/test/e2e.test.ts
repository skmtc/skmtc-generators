/**
 * A full Parse → Generate → Render run over a fixture schema. Artifact keys and
 * import text are where a host-specific path separator would show, so they are
 * pinned here: on Windows, an OS-aware `join` turned `@/types/x.ts` into
 * `@\types\x.ts`, and tests that never looked at a key or an import passed.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { MswEntry } from '../src/mod.ts'

const documentObject: OpenAPIV3.Document = {
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

const runFixture = () =>
  toArtifacts({
    traceId: 'gen-msw-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './src' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-msw': MswEntry
    })
  })

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  const { artifacts } = runFixture()

  assertEquals(Object.keys(artifacts).sort(), [
    'src/mocks/handlers.generated.ts',
    'src/types/newUser.generated.ts',
    'src/types/user.generated.ts'
  ])
})

Deno.test('e2e - generated imports name workspace paths with forward slashes', () => {
  const { artifacts } = runFixture()

  assertStringIncludes(
    artifacts['src/mocks/handlers.generated.ts'],
    `import type {User} from '@/types/user.generated.ts'\n`
  )
})
