/**
 * A full Parse → Generate → Render run over a fixture schema. Artifact keys and
 * import text are where a host-specific path separator would show, so they are
 * pinned here: on Windows, an OS-aware `join` turned `@/types/x.ts` into
 * `@\types\x.ts`, and tests that never looked at a key or an import passed.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { typescriptEntry } from '../src/mod.ts'

const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      // A cross-file ref, so the user file has to import the status file.
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

const runFixture = () =>
  toArtifacts({
    traceId: 'gen-typescript-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './src' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-typescript': typescriptEntry
    })
  })

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  const { artifacts } = runFixture()

  assertEquals(Object.keys(artifacts).sort(), [
    'src/types/status.generated.ts',
    'src/types/user.generated.ts'
  ])
})

Deno.test('e2e - generated imports name workspace paths with forward slashes', () => {
  const { artifacts } = runFixture()

  assertStringIncludes(
    artifacts['src/types/user.generated.ts'],
    `import type {Status} from '@/types/status.generated.ts'\n`
  )
})
