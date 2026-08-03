/**
 * Engine gate for @skmtc/gen-kotlin-spring: the fixture runs through
 * the REAL pipeline with BOTH generators (this one + its model peer
 * @skmtc/gen-kotlin-jackson) and key artifacts are pinned.
 * Coverage: one controller per supported operation (HEAD filtered by
 * isSupported), inline request body consumed as a jackson-produced
 * named model via insertNormalizedModel, cross-package import
 * stitching, 204 -> Unit, and the trap gate (controllers contain no
 * data classes — schemas are the model generator's job).
 *
 * Authored 2026-08-03 via the skmtc-operation-v3 + skmtc-lang-kotlin-v3
 * skills (task1o, run spring-server-1).
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { assertEquals, assertStringIncludes } from '@std/assert'
import jacksonEntry from '@skmtc/gen-kotlin-jackson'
import serverEntry from './mod.ts'

const fixture = JSON.parse(Deno.readTextFileSync(new URL('./test-fixture.json', import.meta.url)))

const generate = () => {
  return toArtifacts({
    traceId: 'gen-kotlin-spring-test',
    spanId: 'gen-kotlin-spring-test',
    document: { type: 'oas', value: fixture as never },
    settings: undefined,
    stackTrail: new StackTrail(['gen', 'test']),
    // Test-only cast bridging the caller-chosen EnrichmentType generic.
    toGeneratorConfigMap: (() => ({
      [jacksonEntry.id]: jacksonEntry,
      [serverEntry.id]: serverEntry
    })) as Parameters<typeof toArtifacts>[0]['toGeneratorConfigMap'],
    startAt: Date.now(),
    silent: true
  })
}

Deno.test('six controllers render; the HEAD operation is filtered out', () => {
  const { artifacts, manifest } = generate()

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)

  const controllers = Object.keys(artifacts).filter(key => key.startsWith('com/example/api/'))
  assertEquals(controllers.length, 6)
})

Deno.test('POST controller pins the full render (peer-consumed body + response)', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['com/example/api/CreateApiOrdersController.generated.kt'],
    `package com.example.api

import com.example.models.CreateApiOrdersBody
import com.example.models.Order
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class CreateApiOrdersController {
    @PostMapping("/orders")
    fun createApiOrders(@RequestBody body: CreateApiOrdersBody): Order = TODO("Implement")
}
`
  )
})

Deno.test('204 handler returns Unit', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['com/example/api/DeleteApiOrdersOrderIdController.generated.kt'],
    `package com.example.api

import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class DeleteApiOrdersOrderIdController {
    @DeleteMapping("/orders/{orderId}")
    fun deleteApiOrdersOrderId(@PathVariable orderId: String): Unit = TODO("Implement")
}
`
  )
})

Deno.test('schemas never render in the api package; normalized models land with jackson', () => {
  const { artifacts } = generate()

  for (const [key, content] of Object.entries(artifacts)) {
    if (key.startsWith('com/example/api/')) {
      assertEquals(content.includes('data class'), false, `${key} contains a data class`)
    }
  }

  assertStringIncludes(artifacts['com/example/models/CreateApiOrdersBody.generated.kt'], 'data class CreateApiOrdersBody')
  assertStringIncludes(artifacts['com/example/models/GetApiOrdersResponse.generated.kt'], 'data class GetApiOrdersResponse')
})
