/**
 * Step-3 e2e gate (note 23): the spec's worked-example fixture through
 * the real pipeline, byte-pinned — gen-kotlin-spring ALONE (DTO peers
 * arrive through the model peer's router; the dependency edge needs no
 * registered model transform) AND BESIDE gen-kotlin-jackson on a shared document (the documented
 * consumer composition; unreferenced schemas appear only here).
 */
import { assertEquals } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import kotlinEntry from '@skmtc/gen-kotlin-jackson'
import type { OpenAPIV3 } from 'openapi-types'
import springEntry from '../src/mod.ts'
import { assertNoResultErrors } from './results.ts'

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
  'import com.example.models.CreateUserBody\n' +
  'import com.example.models.User\n' +
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
  return toArtifacts({
    traceId: 'gen-kotlin-spring-e2e',
    spanId: besideGenKotlin ? 'beside' : 'alone',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: {
      basePath: './app/src/main/kotlin',
      // Both basePackages are REQUIRED generator-scope enrichments (no
      // defaults — a placeholder package must never ship silently).
      // jackson's is read by the value layer even in the `alone` run,
      // and the fixture deliberately picks a DIFFERENT package for it so
      // DTO references cross packages and their imports are stitched by
      // the engine.
      enrichments: {
        '@skmtc/gen-kotlin-spring': { _generator: { basePackage: 'com.example.api' } },
        '@skmtc/gen-kotlin-jackson': { _generator: { basePackage: 'com.example.models' } }
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () =>
      // @ts-expect-error - factory entry vs the generic config map (the known variance gap)
      besideGenKotlin
        ? { '@skmtc/gen-kotlin-spring': springEntry, '@skmtc/gen-kotlin-jackson': kotlinEntry }
        : { '@skmtc/gen-kotlin-spring': springEntry }
  })
}

Deno.test('e2e alone - UsersApi renders the worked example; ref DTOs arrive via insertion', () => {
  const { artifacts, manifest } = runFixture({ besideGenKotlin: false })

  assertEquals(Object.keys(artifacts).sort(), [
    'app/src/main/kotlin/com/example/api/ApiError.generated.kt',
    'app/src/main/kotlin/com/example/api/UsersApi.generated.kt',
    'app/src/main/kotlin/com/example/models/CreateUserBody.generated.kt',
    'app/src/main/kotlin/com/example/models/User.generated.kt'
  ])

  assertEquals(artifacts['app/src/main/kotlin/com/example/api/UsersApi.generated.kt'], expectedUsersApi)
  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
  // A generate-phase throw never touches parseIssues — gate that
  // channel too, or a silently-errored subject renders an empty shell.
  assertNoResultErrors(manifest)
})

Deno.test('e2e beside gen-kotlin-jackson - identical UsersApi; unreferenced schemas join the output', () => {
  const { artifacts, manifest } = runFixture({ besideGenKotlin: true })

  assertEquals(Object.keys(artifacts).sort(), [
    'app/src/main/kotlin/com/example/api/ApiError.generated.kt',
    'app/src/main/kotlin/com/example/api/UsersApi.generated.kt',
    'app/src/main/kotlin/com/example/models/CreateUserBody.generated.kt',
    'app/src/main/kotlin/com/example/models/Status.generated.kt',
    'app/src/main/kotlin/com/example/models/User.generated.kt'
  ])

  assertEquals(artifacts['app/src/main/kotlin/com/example/api/UsersApi.generated.kt'], expectedUsersApi)

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/models/User.generated.kt'],
    'package com.example.models\n' +
      '\n' +
      'import com.fasterxml.jackson.annotation.JsonProperty\n' +
      '\n' +
      'data class User(\n' +
      '    @JsonProperty("user_id")\n' +
      '    val userId: String,\n' +
      '    val name: String,\n' +
      '    val email: String? = null\n' +
      ')\n'
  )

  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
  // A generate-phase throw never touches parseIssues — gate that
  // channel too, or a silently-errored subject renders an empty shell.
  assertNoResultErrors(manifest)
})

Deno.test('e2e - the two runs render byte-identical files for the shared set', () => {
  const alone = runFixture({ besideGenKotlin: false })
  const beside = runFixture({ besideGenKotlin: true })

  for (const path of Object.keys(alone.artifacts)) {
    assertEquals(beside.artifacts[path], alone.artifacts[path], `mismatch at ${path}`)
  }
})
