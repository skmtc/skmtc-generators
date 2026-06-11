/**
 * Step-2 unit gate (note 23): the tag-grouping accumulator and the
 * method builder over a parse fixture, through the real pipeline —
 * gen-kotlin-spring running ALONE (primitive + inline shapes only; the
 * ref-typed worked example beside gen-kotlin is the step-3 e2e).
 */
import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { toKotlinSpringEntry } from '../src/mod.ts'

const springEntry = toKotlinSpringEntry({ basePackage: 'com.example.spring' })

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

const runFixture = () => {
  return toArtifacts({
    traceId: 'gen-kotlin-spring-unit',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: { basePath: './server/src/main/kotlin' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-kotlin-spring': springEntry
    })
  })
}

Deno.test('one interface per tag — untagged → DefaultApi, multi-tag joins its FIRST tag only', () => {
  const { artifacts, manifest } = runFixture()

  assertEquals(Object.keys(artifacts).sort(), [
    'server/src/main/kotlin/com/example/spring/DefaultApi.generated.kt',
    'server/src/main/kotlin/com/example/spring/HealthApi.generated.kt',
    'server/src/main/kotlin/com/example/spring/UsersApi.generated.kt'
  ])

  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
})

Deno.test('UsersApi accumulates methods in document order — params, body, return type, synthesized body sibling', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['server/src/main/kotlin/com/example/spring/UsersApi.generated.kt'],
    'package com.example.spring\n' +
      '\n' +
      'import kotlinx.serialization.Serializable\n' +
      'import org.springframework.web.bind.annotation.GetMapping\n' +
      'import org.springframework.web.bind.annotation.PathVariable\n' +
      'import org.springframework.web.bind.annotation.PostMapping\n' +
      'import org.springframework.web.bind.annotation.RequestBody\n' +
      'import org.springframework.web.bind.annotation.RequestParam\n' +
      '\n' +
      'interface UsersApi {\n' +
      '    @GetMapping("/users/{id}")\n' +
      '    fun getUsersId(@PathVariable("id") id: String, @RequestParam("verbose") verbose: Boolean?): String\n' +
      '\n' +
      '    @PostMapping("/users")\n' +
      '    fun postUsers(@RequestBody body: PostUsersBody)\n' +
      '}\n' +
      '\n' +
      '@Serializable\n' +
      'data class PostUsersBody(\n' +
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
      '\n' +
      'interface HealthApi {\n' +
      '    @RequestMapping(method = [RequestMethod.HEAD], path = ["/ping"])\n' +
      '    fun headPing()\n' +
      '\n' +
      '    @GetMapping("/status")\n' +
      '    fun getStatus()\n' +
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
      '\n' +
      'interface DefaultApi {\n' +
      '    @GetMapping("/untagged")\n' +
      '    fun getUntagged()\n' +
      '}\n'
  )
})

Deno.test('basePackage segments are validated up front', () => {
  assertThrows(
    () => toKotlinSpringEntry({ basePackage: 'com.example.object' }),
    Error,
    'not a valid Kotlin package name'
  )

  assertThrows(
    () => toKotlinSpringEntry({ basePackage: 'com.my-models' }),
    Error,
    'not a valid Kotlin package name'
  )
})
