/**
 * Step-2 unit gate (note 23): the tag-grouping accumulator and the
 * method builder over a parse fixture, through the real pipeline —
 * gen-kotlin-spring running ALONE (primitive + inline shapes only; the
 * ref-typed worked example beside gen-kotlin is the step-3 e2e).
 */
import { assertEquals, assertStringIncludes, assertThrows } from '@std/assert'
import * as v from 'valibot'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import springEntry from '../src/mod.ts'
import { generatorConfigSchema } from '../src/enrichments.ts'

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
            content: { 'application/json': { schema: { type: 'string' } } }
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
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name']
              }
            }
          }
        },
        responses: { '201': { description: 'created' } }
      }
    },
    '/ping': {
      head: {
        tags: ['health'],
        responses: { '200': { description: 'ok' } }
      }
    },
    '/status': {
      get: {
        tags: ['health', 'ops'],
        responses: { '200': { description: 'ok' } }
      }
    },
    '/untagged': {
      get: {
        responses: { '200': { description: 'ok' } }
      }
    }
  }
}

const enumParamDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'enum-param', version: '0.0.0' },
  paths: {
    '/users/{id}': {
      get: {
        tags: ['users'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } }
        ],
        responses: { '200': { description: 'ok' } }
      }
    }
  }
}

type RunFixtureOptions = {
  document?: OpenAPIV3.Document
  springEnrichment?: Record<string, unknown>
}

const runFixture = ({ document = documentObject, springEnrichment }: RunFixtureOptions = {}) => {
  return toArtifacts({
    traceId: 'gen-kotlin-spring-unit',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: {
      basePath: './server/src/main/kotlin',
      enrichments: {
        '@skmtc/gen-kotlin-spring': springEnrichment ?? {
          _generator: { basePackage: 'com.example.spring' }
        },
        // jackson's basePackage is a REQUIRED generator-scope enrichment,
        // read by the value layer even when its transform isn't
        // registered — the `alone` runs still emit DTO types through its
        // router.
        '@skmtc/gen-kotlin-jackson': { _generator: { basePackage: 'com.example.models' } }
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - entry vs the generic config map (the known variance gap)
      '@skmtc/gen-kotlin-spring': springEntry
    })
  })
}

/**
 * A generate-phase throw never touches `parseIssues` — it lands in
 * `manifest.results.generate` as a per-subject `error`, while the
 * accumulator's already-registered container still renders a
 * valid-but-empty file. Every fixture asserts BOTH channels.
 */
const assertNoGenerateErrors = (manifest: { results: unknown }) => {
  assertEquals(JSON.stringify(manifest.results).includes('error'), false)
}

Deno.test('one interface per tag — untagged → DefaultApi, multi-tag joins its FIRST tag only', () => {
  const { artifacts, manifest } = runFixture()

  assertEquals(Object.keys(artifacts).sort(), [
    'server/src/main/kotlin/com/example/models/CreateApiUsersBody.generated.kt',
    'server/src/main/kotlin/com/example/spring/ApiError.generated.kt',
    'server/src/main/kotlin/com/example/spring/DefaultApi.generated.kt',
    'server/src/main/kotlin/com/example/spring/HealthApi.generated.kt',
    'server/src/main/kotlin/com/example/spring/UsersApi.generated.kt'
  ])

  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
  assertNoGenerateErrors(manifest)
})

Deno.test('UsersApi accumulates methods in document order — params, body, return type, stackTrail-named body sibling', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/spring/UsersApi.generated.kt'],
    'package com.example.spring\n' +
      '\n' +
      'import com.example.models.CreateApiUsersBody\n' +
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
      '    fun getUsersId(id: String, verbose: Boolean? = null): String\n' +
      '\n' +
      '    fun postUsers(body: CreateApiUsersBody)\n' +
      '}\n' +
      '\n' +
      '@RestController\n' +
      'class UsersController(\n' +
      '    private val service: UsersService\n' +
      ') {\n' +
      '    @GetMapping("/users/{id}")\n' +
      '    fun getUsersId(@PathVariable("id") id: String, @RequestParam("verbose") verbose: Boolean?): String = service.getUsersId(id, verbose)\n' +
      '\n' +
      '    @PostMapping("/users")\n' +
      '    @ResponseStatus(HttpStatus.CREATED)\n' +
      '    fun postUsers(@RequestBody body: CreateApiUsersBody) = service.postUsers(body)\n' +
      '}\n'
  )

  // The synthesized body class lives in its OWN models-package file
  // (every synthesized declaration shares one placement policy), and
  // the API file above imports it across packages.
  assertEquals(
    artifacts['server/src/main/kotlin/com/example/models/CreateApiUsersBody.generated.kt'],
    'package com.example.models\n' +
      '\n' +
      'data class CreateApiUsersBody(\n' +
      '    val name: String\n' +
      ')\n'
  )
})

Deno.test('non-mapping methods fall back to @RequestMapping; no-content responses omit the return type', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/spring/HealthApi.generated.kt'],
    'package com.example.spring\n' +
      '\n' +
      'import org.springframework.web.bind.annotation.GetMapping\n' +
      'import org.springframework.web.bind.annotation.RequestMapping\n' +
      'import org.springframework.web.bind.annotation.RequestMethod\n' +
      'import org.springframework.web.bind.annotation.RestController\n' +
      '\n' +
      'interface HealthService {\n' +
      '    fun headPing()\n' +
      '\n' +
      '    fun getStatus()\n' +
      '}\n' +
      '\n' +
      '@RestController\n' +
      'class HealthController(\n' +
      '    private val service: HealthService\n' +
      ') {\n' +
      '    @RequestMapping(method = [RequestMethod.HEAD], path = ["/ping"])\n' +
      '    fun headPing() = service.headPing()\n' +
      '\n' +
      '    @GetMapping("/status")\n' +
      '    fun getStatus() = service.getStatus()\n' +
      '}\n'
  )
})

Deno.test('untagged operations land in DefaultApi', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/spring/DefaultApi.generated.kt'],
    'package com.example.spring\n' +
      '\n' +
      'import org.springframework.web.bind.annotation.GetMapping\n' +
      'import org.springframework.web.bind.annotation.RestController\n' +
      '\n' +
      'interface DefaultService {\n' +
      '    fun getUntagged()\n' +
      '}\n' +
      '\n' +
      '@RestController\n' +
      'class DefaultController(\n' +
      '    private val service: DefaultService\n' +
      ') {\n' +
      '    @GetMapping("/untagged")\n' +
      '    fun getUntagged() = service.getUntagged()\n' +
      '}\n'
  )
})

Deno.test('an inline enum query parameter names by the PARAMETER name, stably', () => {
  // The jackson peer resolves a parameters/<index> trail position to
  // the parameter's NAME via its document scan (PR #30) — this is the
  // operation-generator side of that contract: the enum class is
  // GetApiUsersIdStatus (not an index-derived name), it lands in the
  // models package, and the signature references it across packages.
  // The unrelated `page` parameter ahead of `status` proves the name
  // reorder-stable.
  const { artifacts, manifest } = runFixture({ document: enumParamDocument })

  assertNoGenerateErrors(manifest)

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/models/GetApiUsersIdStatus.generated.kt'],
    'package com.example.models\n' +
      '\n' +
      'import com.fasterxml.jackson.annotation.JsonProperty\n' +
      '\n' +
      'enum class GetApiUsersIdStatus {\n' +
      '    @JsonProperty("active")\n' +
      '    ACTIVE,\n' +
      '    @JsonProperty("inactive")\n' +
      '    INACTIVE\n' +
      '}\n'
  )
  assertStringIncludes(
    artifacts['server/src/main/kotlin/com/example/spring/UsersApi.generated.kt'],
    '@RequestParam("status") status: GetApiUsersIdStatus?'
  )
})

Deno.test('basePackage segments are validated by the config schema', () => {
  assertThrows(
    () => v.parse(generatorConfigSchema, { basePackage: 'com.example.object' }),
    Error,
    'Kotlin package name'
  )

  assertThrows(
    () => v.parse(generatorConfigSchema, { basePackage: 'com.my-models' }),
    Error,
    'Kotlin package name'
  )
})

Deno.test('serviceMethodName enrichment renames the seam and the delegation in lockstep', () => {
  const { artifacts } = runFixture({
    springEnrichment: {
      _generator: { basePackage: 'com.example.spring' },
      '/users/{id}': { get: { main: { serviceMethodName: 'getUser' } } }
    }
  })

  const usersApi = artifacts['server/src/main/kotlin/com/example/spring/UsersApi.generated.kt']

  assertStringIncludes(usersApi, 'fun getUser(id: String, verbose: Boolean? = null): String')
  assertStringIncludes(usersApi, ' = service.getUser(id, verbose)')
  assertEquals(usersApi.includes('getUsersId'), false)
})

Deno.test('the error channel renders once: ApiError + advice, byte-pinned', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/spring/ApiError.generated.kt'],
    'package com.example.spring\n' +
      '\n' +
      'import org.springframework.http.ResponseEntity\n' +
      'import org.springframework.web.bind.annotation.ExceptionHandler\n' +
      'import org.springframework.web.bind.annotation.RestControllerAdvice\n' +
      'import org.springframework.web.server.ResponseStatusException\n' +
      '\n' +
      '/** The wire shape every handled error renders to. */\n' +
      'data class ApiError(\n' +
      '    val status: Int,\n' +
      '    val message: String? = null\n' +
      ')\n' +
      '\n' +
      '/** Maps ResponseStatusException thrown by service implementations to ApiError bodies. */\n' +
      '@RestControllerAdvice\n' +
      'class ApiErrorHandler {\n' +
      '    @ExceptionHandler(ResponseStatusException::class)\n' +
      '    fun handleResponseStatus(exception: ResponseStatusException): ResponseEntity<ApiError> = ResponseEntity.status(exception.statusCode).body(ApiError(exception.statusCode.value(), exception.reason))\n' +
      '}\n'
  )
})
