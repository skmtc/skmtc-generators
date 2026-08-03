/**
 * Engine gate for @skmtc/gen-kotlin-jackson: the fixture runs through
 * the REAL pipeline and key artifacts are pinned byte-for-byte.
 * Fixture coverage: snake_case wire keys (@JsonProperty), the hard
 * keyword `object` (backticked, unannotated), enum class with wire
 * mapping, optional/nullable single-?, shared ref (Address x2 -> one
 * definition), self-recursion (Category).
 *
 * Authored 2026-08-03 via the skmtc-model-v3 + skmtc-lang-kotlin-v3
 * skills (task1k, run kotlin-jackson-1); validated against the Reapit
 * (491 schemas) and OpenAI (1016 schemas) specs same day.
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { assertEquals, assertStringIncludes } from '@std/assert'
import entry from './mod.ts'

const fixture = JSON.parse(Deno.readTextFileSync(new URL('./test-fixture.json', import.meta.url)))

const generate = () => {
  return toArtifacts({
    traceId: 'gen-kotlin-jackson-test',
    spanId: 'gen-kotlin-jackson-test',
    document: { type: 'oas', value: fixture as never },
    settings: undefined,
    stackTrail: new StackTrail(['gen', 'test']),
    // Test-only cast bridging the caller-chosen EnrichmentType generic.
    toGeneratorConfigMap: (() => ({
      [entry.id]: entry
    })) as Parameters<typeof toArtifacts>[0]['toGeneratorConfigMap'],
    startAt: Date.now(),
    silent: true
  })
}

Deno.test('every model renders to its own file in the fixed package', () => {
  const { artifacts, manifest } = generate()

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)
  assertEquals(Object.keys(artifacts).toSorted(), [
    'com/example/models/Address.generated.kt',
    'com/example/models/Category.generated.kt',
    'com/example/models/Order.generated.kt',
    'com/example/models/OrderItem.generated.kt',
    'com/example/models/OrderStatus.generated.kt'
  ])
})

Deno.test('Order pins the full render (wire names, keyword, optionality)', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['com/example/models/Order.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonProperty

data class Order(
    val id: String,
    val \`object\`: String,
    val status: OrderStatus,
    val items: List<OrderItem>,
    @JsonProperty("shipping_address")
    val shippingAddress: Address,
    @JsonProperty("billing_address")
    val billingAddress: Address? = null,
    @JsonProperty("customer_notes")
    val customerNotes: String? = null
)
`
  )
})

Deno.test('enum class carries per-entry wire mapping', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['com/example/models/OrderStatus.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonProperty

enum class OrderStatus {
    @JsonProperty("pending")
    PENDING,
    @JsonProperty("paid")
    PAID,
    @JsonProperty("shipped")
    SHIPPED,
    @JsonProperty("cancelled")
    CANCELLED
}
`
  )
})

Deno.test('self-recursion renders a nullable list of self', () => {
  const { artifacts } = generate()

  assertStringIncludes(
    artifacts['com/example/models/Category.generated.kt'],
    'val children: List<Category>? = null'
  )
})
