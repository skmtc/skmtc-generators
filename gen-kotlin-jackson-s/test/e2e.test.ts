/**
 * Wiring gate for the standalone jackson-s entry: a full
 * Parse → Generate → Render run over a fixture proves the
 * `toJacksonSEntry` → `JacksonSModel` (`toIdentifierName`/`toIdentifierType`)
 * → `SdkModelValue` engine path emits the Stainless model shape at the
 * package-=-folder path. (The engine's BYTE-exact Stainless parity is the
 * corpus harness's job — OneBusAway 232/232; this pins the projection
 * wiring the SDK does not exercise.)
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { jacksonSEntry } from '@/mod.ts'
import { resetModelConfig } from '@/modelConfig.ts'

// The plain entry reads its model identity from `src/settings.json`
// (basePackage 'org.example.api'); the fixture paths below match it.
const entry = jacksonSEntry

const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id']
      },
      // Non-object component — produces NO artifact (filtered in transform).
      UserId: { type: 'string' }
    }
  }
}

const runFixture = () => {
  resetModelConfig()

  return toArtifacts({
    traceId: 'jackson-s-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './src/main/kotlin' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-kotlin-jackson-s': entry
    })
  })
}

Deno.test('jackson-s e2e - object component -> one model file at the package path; non-object skipped', () => {
  const { artifacts, manifest } = runFixture()

  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
  assertEquals(Object.keys(artifacts), ['src/main/kotlin/org/example/api/models/User.kt'])
})

Deno.test('jackson-s e2e - the model is the Stainless JsonField class shape', () => {
  const { artifacts } = runFixture()

  const user = artifacts['src/main/kotlin/org/example/api/models/User.kt']

  // package derived from the export path segments; Stainless file header.
  assertStringIncludes(user, 'package org.example.api.models')
  assertStringIncludes(user, '// File generated from our OpenAPI spec by Stainless.')
  // the class shell with the @JsonCreator private constructor (KtConstructed).
  assertStringIncludes(user, 'class User')
  assertStringIncludes(user, '@JsonCreator(mode = JsonCreator.Mode.DISABLED)')
  // JsonField-typed fields + the builder companion — the Stainless shape.
  assertStringIncludes(user, 'JsonField<')
  assertStringIncludes(user, 'companion object')
})
