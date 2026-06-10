/**
 * The bench-style end-to-end gate (note 19, step 4): a full
 * Parse → Generate → Render run over a fixture schema through the real
 * pipeline, pinning whole-file Kotlin output byte-for-byte.
 */
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { toKotlinEntry } from '../src/mod.ts'

const kotlinEntry = toKotlinEntry({ basePackage: 'com.example.api' })

const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          age: { type: 'integer', format: 'int64' },
          status: { $ref: '#/components/schemas/Status' },
          tags: { type: 'array', items: { type: 'string' } },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' }
            },
            required: ['street']
          },
          metadata: { type: 'object', additionalProperties: { type: 'string' } }
        },
        required: ['user_id', 'name']
      },
      Status: {
        type: 'string',
        enum: ['active', 'inactive', 'in-progress']
      },
      UserList: {
        type: 'array',
        items: { $ref: '#/components/schemas/User' }
      },
      UserId: { type: 'string', format: 'uuid' }
    }
  }
}

const runFixture = () => {
  return toArtifacts({
    traceId: 'gen-kotlin-e2e',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './app/src/main/kotlin' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-kotlin': kotlinEntry
    })
  })
}

Deno.test('e2e - artifacts land on the Gradle package-=-folder layout', () => {
  const { artifacts, manifest } = runFixture()

  assertEquals(Object.keys(artifacts).sort(), [
    'app/src/main/kotlin/com/example/api/Status.generated.kt',
    'app/src/main/kotlin/com/example/api/User.generated.kt',
    'app/src/main/kotlin/com/example/api/UserId.generated.kt',
    'app/src/main/kotlin/com/example/api/UserList.generated.kt'
  ])

  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
})

Deno.test('e2e - User renders the Track 2 worked-example shape (data class + synthesized sibling)', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/User.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.SerialName\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      'data class UserAddress(\n' +
      '    val street: String,\n' +
      '    val city: String? = null\n' +
      ')\n' +
      '\n' +
      '@Serializable\n' +
      'data class User(\n' +
      '    @SerialName("user_id") val userId: String,\n' +
      '    val name: String,\n' +
      '    val email: String? = null,\n' +
      '    val age: Long? = null,\n' +
      '    val status: Status? = null,\n' +
      '    val tags: List<String>? = null,\n' +
      '    val address: UserAddress? = null,\n' +
      '    val metadata: Map<String, String>? = null\n' +
      ')\n'
  )
})

Deno.test('e2e - Status renders an enum class with @SerialName wire values', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/Status.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.SerialName\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      'enum class Status {\n' +
      '    @SerialName("active") ACTIVE,\n' +
      '    @SerialName("inactive") INACTIVE,\n' +
      '    @SerialName("in-progress") IN_PROGRESS\n' +
      '}\n'
  )
})

Deno.test('e2e - non-object schemas render typealiases; same-package peer imports are suppressed', () => {
  const { artifacts } = runFixture()

  // UserList references User — same package, so NO import line renders.
  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/UserList.generated.kt'],
    'package com.example.api\n\ntypealias UserList = List<User>\n'
  )

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/UserId.generated.kt'],
    'package com.example.api\n\ntypealias UserId = String\n'
  )
})

Deno.test('e2e - keyword properties backtick-escape without a rename annotation', () => {
  const keywordDocument: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: { title: 'Keyword API', version: '1.0.0' },
    paths: {},
    components: {
      schemas: {
        Wrapper: {
          type: 'object',
          properties: { object: { type: 'string' } },
          required: ['object']
        }
      }
    }
  }

  const { artifacts } = toArtifacts({
    traceId: 'gen-kotlin-e2e',
    spanId: 'keyword',
    startAt: Date.now(),
    document: { type: 'oas', value: keywordDocument },
    settings: { basePath: './app/src/main/kotlin' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-kotlin': kotlinEntry
    })
  })

  // `object` is a hard keyword: backticked, name still equals the wire
  // name, so no @SerialName (and no SerialName import).
  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/Wrapper.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      'data class Wrapper(\n' +
      '    val `object`: String\n' +
      ')\n'
  )
})
