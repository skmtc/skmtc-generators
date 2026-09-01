/**
 * The `emitServiceImplementations` scaffolds: one `Default<Tag>Service`
 * beside each tag file, every method throwing 501. Off by default;
 * byte-pinned when on, because the file has to COMPILE against the
 * generated interface — no repeated default values, `override` on every
 * method, and the DTO imports resolved into THIS file rather than left
 * behind in the tag file.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import kotlinEntry from '@skmtc/gen-kotlin-jackson'
import type { OpenAPIV3 } from 'openapi-types'
import springEntry from '../src/mod.ts'
import { assertHasResultError, assertNoResultErrors } from './results.ts'

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
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
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
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
          }
        }
      }
    },
    '/ping': { head: { tags: ['health'], responses: { '204': { description: 'ok' } } } }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: { user_id: { type: 'string' }, name: { type: 'string' } },
        required: ['user_id', 'name']
      },
      CreateUserBody: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      }
    }
  }
}

const runFixture = (emitServiceImplementations: boolean) => {
  return toArtifacts({
    traceId: 'gen-kotlin-spring-implementations',
    spanId: `${emitServiceImplementations}`,
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: {
      basePath: './server/src/main/kotlin',
      enrichments: {
        '@skmtc/gen-kotlin-spring': {
          _generator: { basePackage: 'com.example.api', emitServiceImplementations }
        },
        '@skmtc/gen-kotlin-jackson': { _generator: { basePackage: 'com.example.models' } }
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - entry vs the generic config map (the known variance gap)
      '@skmtc/gen-kotlin-spring': springEntry,
      // @ts-expect-error - entry vs the generic config map (the known variance gap)
      '@skmtc/gen-kotlin-jackson': kotlinEntry
    })
  })
}

Deno.test('scaffolds are off unless asked for', () => {
  const { artifacts } = runFixture(false)

  // The WHOLE key list, not a filter: a filter naming the scaffolds cannot
  // fail if a rename moves them, and this has to fail if the switch ever
  // defaults to on.
  assertEquals(Object.keys(artifacts).sort(), [
    'server/src/main/kotlin/com/example/api/ApiError.generated.kt',
    'server/src/main/kotlin/com/example/api/HealthApi.generated.kt',
    'server/src/main/kotlin/com/example/api/UsersApi.generated.kt',
    'server/src/main/kotlin/com/example/models/CreateUserBody.generated.kt',
    'server/src/main/kotlin/com/example/models/User.generated.kt'
  ])
})

Deno.test('one scaffold per tag, byte-pinned', () => {
  const { artifacts, manifest } = runFixture(true)

  assertEquals(Object.keys(artifacts).sort(), [
    'server/src/main/kotlin/com/example/api/ApiError.generated.kt',
    'server/src/main/kotlin/com/example/api/DefaultHealthService.generated.kt',
    'server/src/main/kotlin/com/example/api/DefaultUsersService.generated.kt',
    'server/src/main/kotlin/com/example/api/HealthApi.generated.kt',
    'server/src/main/kotlin/com/example/api/UsersApi.generated.kt',
    'server/src/main/kotlin/com/example/models/CreateUserBody.generated.kt',
    'server/src/main/kotlin/com/example/models/User.generated.kt'
  ])

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/api/DefaultUsersService.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import com.example.models.CreateUserBody\n' +
      'import com.example.models.User\n' +
      'import org.springframework.http.HttpStatus\n' +
      'import org.springframework.stereotype.Service\n' +
      'import org.springframework.web.server.ResponseStatusException\n' +
      '\n' +
      '/** Scaffolded implementation of UsersService — every method answers 501. ' +
      'Run `skmtc eject` on this file before replacing a body with real logic. */\n' +
      '@Service\n' +
      'class DefaultUsersService : UsersService {\n' +
      '    override fun getUsersId(id: String, verbose: Boolean?): User = ' +
      'throw ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "getUsersId is not implemented")\n' +
      '\n' +
      '    override fun postUsers(body: CreateUserBody): User = ' +
      'throw ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "postUsers is not implemented")\n' +
      '}\n'
  )

  assertNoResultErrors(manifest)
})

Deno.test('an override repeats neither the default values nor the binding annotations', () => {
  const { artifacts } = runFixture(true)

  const implementation = artifacts['server/src/main/kotlin/com/example/api/DefaultUsersService.generated.kt']
  const api = artifacts['server/src/main/kotlin/com/example/api/UsersApi.generated.kt']

  // The interface carries the default; repeating it in the override is a
  // Kotlin compile error.
  assertStringIncludes(api, 'fun getUsersId(id: String, verbose: Boolean? = null): User')
  assertEquals(implementation.includes('= null'), false)

  // Binding annotations belong to the controller — building them for the
  // scaffold would drag Spring's web-bind imports into a file with no use
  // for them.
  assertEquals(implementation.includes('org.springframework.web.bind'), false)
  assertEquals(implementation.includes('@RequestParam'), false)
})

Deno.test('a no-content operation scaffolds without a return type', () => {
  const { artifacts } = runFixture(true)

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/api/DefaultHealthService.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import org.springframework.http.HttpStatus\n' +
      'import org.springframework.stereotype.Service\n' +
      'import org.springframework.web.server.ResponseStatusException\n' +
      '\n' +
      '/** Scaffolded implementation of HealthService — every method answers 501. ' +
      'Run `skmtc eject` on this file before replacing a body with real logic. */\n' +
      '@Service\n' +
      'class DefaultHealthService : HealthService {\n' +
      '    override fun headPing() = ' +
      'throw ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "headPing is not implemented")\n' +
      '}\n'
  )
})

Deno.test('a scaffold name colliding with another tag\'s interface fails that subject', () => {
  // `users` scaffolds to DefaultUsersService; `default users` names its
  // interface the same thing, and both land in one package.
  const collidingDocument: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: { title: 'collision', version: '1.0.0' },
    paths: {
      '/users': { get: { tags: ['users'], responses: { '204': { description: 'ok' } } } },
      '/default-users': {
        get: { tags: ['default users'], responses: { '204': { description: 'ok' } } }
      }
    }
  }

  const { artifacts, manifest } = toArtifacts({
    traceId: 'gen-kotlin-spring-implementations',
    spanId: 'collision',
    startAt: Date.now(),
    document: { type: 'oas', value: collidingDocument },
    settings: {
      basePath: './server/src/main/kotlin',
      enrichments: {
        '@skmtc/gen-kotlin-spring': {
          _generator: { basePackage: 'com.example.api', emitServiceImplementations: true }
        },
        '@skmtc/gen-kotlin-jackson': { _generator: { basePackage: 'com.example.models' } }
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - entry vs the generic config map (the known variance gap)
    toGeneratorConfigMap: () => ({ '@skmtc/gen-kotlin-spring': springEntry })
  })

  assertHasResultError(manifest)
  // The colliding scaffold is absent — never emitted as an uncompilable file.
  assertEquals(
    Object.keys(artifacts).includes(
      'server/src/main/kotlin/com/example/api/DefaultUsersService.generated.kt'
    ),
    false
  )
})
