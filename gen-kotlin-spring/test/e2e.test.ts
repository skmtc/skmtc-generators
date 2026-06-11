/**
 * Step-3 e2e gate (note 23): the spec's worked-example fixture through
 * the real pipeline, byte-pinned — gen-kotlin-spring ALONE (DTO peers
 * arrive through KtRef insertion; the dependency edge needs no gen-kotlin
 * transform) AND BESIDE gen-kotlin on a shared document (the documented
 * consumer composition; unreferenced schemas appear only here).
 */
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import { toKotlinEntry } from '@skmtc/gen-kotlin'
import type { OpenAPIV3 } from 'openapi-types'
import { toKotlinSpringEntry } from '../src/mod.ts'

const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {
    '/users/{id}': {
      get: {
        tags: ['users'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'verbose', in: 'query', schema: { type: 'boolean' } }
        ],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } }
            }
          }
        }
      }
    },
    '/users': {
      post: {
        tags: ['users'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateUserBody' } }
          }
        },
        responses: {
          '201': {
            description: 'created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' }
        },
        required: ['user_id', 'name']
      },
      CreateUserBody: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      },
      Status: {
        type: 'string',
        enum: ['active', 'inactive']
      }
    }
  }
}

const expectedUsersApi =
  'package com.example.api\n' +
  '\n' +
  'import org.springframework.http.HttpStatus\n' +
  'import org.springframework.web.bind.annotation.GetMapping\n' +
  'import org.springframework.web.bind.annotation.PathVariable\n' +
  'import org.springframework.web.bind.annotation.PostMapping\n' +
  'import org.springframework.web.bind.annotation.RequestBody\n' +
  'import org.springframework.web.bind.annotation.RequestParam\n' +
  'import org.springframework.web.bind.annotation.ResponseStatus\n' +
  'import org.springframework.web.bind.annotation.RestController\n' +
  '\n' +
  'interface UsersService {\n' +
  '    fun getUsersId(id: String, verbose: Boolean? = null): User\n' +
  '\n' +
  '    fun postUsers(body: CreateUserBody): User\n' +
  '}\n' +
  '\n' +
  '@RestController\n' +
  'class UsersController(\n' +
  '    private val service: UsersService\n' +
  ') {\n' +
  '    @GetMapping("/users/{id}")\n' +
  '    fun getUsersId(@PathVariable("id") id: String, @RequestParam("verbose") verbose: Boolean?): User = service.getUsersId(id, verbose)\n' +
  '\n' +
  '    @PostMapping("/users")\n' +
  '    @ResponseStatus(HttpStatus.CREATED)\n' +
  '    fun postUsers(@RequestBody body: CreateUserBody): User = service.postUsers(body)\n' +
  '}\n'

type RunFixtureArgs = {
  besideGenKotlin: boolean
}

const runFixture = ({ besideGenKotlin }: RunFixtureArgs) => {
  // Construct per run — entry construction writes the module-scope
  // basePackage state in BOTH generators (gen-kotlin's is read by the
  // KtRef insertion path even when its transform isn't registered).
  const springEntry = toKotlinSpringEntry({ basePackage: 'com.example.api' })
  const kotlinEntry = toKotlinEntry({ basePackage: 'com.example.api' })

  return toArtifacts({
    traceId: 'gen-kotlin-spring-e2e',
    spanId: besideGenKotlin ? 'beside' : 'alone',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './app/src/main/kotlin' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () =>
      // @ts-expect-error - the factory-emitted entries are monomorphic over EnrichmentType
      besideGenKotlin
        ? { '@skmtc/gen-kotlin-spring': springEntry, '@skmtc/gen-kotlin': kotlinEntry }
        : { '@skmtc/gen-kotlin-spring': springEntry }
  })
}

Deno.test('e2e alone - UsersApi renders the worked example; ref DTOs arrive via insertion', () => {
  const { artifacts, manifest } = runFixture({ besideGenKotlin: false })

  assertEquals(Object.keys(artifacts).sort(), [
    'app/src/main/kotlin/com/example/api/ApiError.generated.kt',
    'app/src/main/kotlin/com/example/api/CreateUserBody.generated.kt',
    'app/src/main/kotlin/com/example/api/User.generated.kt',
    'app/src/main/kotlin/com/example/api/UsersApi.generated.kt'
  ])

  assertEquals(artifacts['app/src/main/kotlin/com/example/api/UsersApi.generated.kt'], expectedUsersApi)
  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
})

Deno.test('e2e beside gen-kotlin - identical UsersApi; unreferenced schemas join the output', () => {
  const { artifacts, manifest } = runFixture({ besideGenKotlin: true })

  assertEquals(Object.keys(artifacts).sort(), [
    'app/src/main/kotlin/com/example/api/ApiError.generated.kt',
    'app/src/main/kotlin/com/example/api/CreateUserBody.generated.kt',
    'app/src/main/kotlin/com/example/api/Status.generated.kt',
    'app/src/main/kotlin/com/example/api/User.generated.kt',
    'app/src/main/kotlin/com/example/api/UsersApi.generated.kt'
  ])

  assertEquals(artifacts['app/src/main/kotlin/com/example/api/UsersApi.generated.kt'], expectedUsersApi)

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/User.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.SerialName\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      'data class User(\n' +
      '    @SerialName("user_id") val userId: String,\n' +
      '    val name: String,\n' +
      '    val email: String? = null\n' +
      ')\n'
  )

  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
})

Deno.test('e2e - the two runs render byte-identical files for the shared set', () => {
  const alone = runFixture({ besideGenKotlin: false })
  const beside = runFixture({ besideGenKotlin: true })

  for (const path of Object.keys(alone.artifacts)) {
    assertEquals(beside.artifacts[path], alone.artifacts[path], `mismatch at ${path}`)
  }
})
