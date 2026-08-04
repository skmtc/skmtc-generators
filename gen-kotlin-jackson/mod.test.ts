/**
 * Engine gate for @skmtc/gen-kotlin-jackson: the fixture runs through
 * the REAL pipeline and key artifacts are pinned byte-for-byte.
 * Fixture coverage: snake_case wire keys (@JsonProperty), the hard
 * keyword `object` (backticked, unannotated), enum class with wire
 * mapping, optional/nullable single-?, shared ref (Address x2 -> one
 * definition), self-recursion (Category); inline object/enum synthesis
 * as stackTrail-named siblings (Order.metadata/Order.priority), the
 * mixed props+additionalProperties catch-all (Settings), a
 * discriminated union as sealed interface + @JsonTypeInfo/@JsonSubTypes
 * (PaymentMethod — mapped tags AND the refName-default tag), member
 * supertype clause + discriminator-property omission, and the JsonNode
 * fallback for a non-qualifying union (LegacyValue).
 *
 * Authored 2026-08-03 via the skmtc-model-v3 + skmtc-lang-kotlin-v3
 * skills (task1k, run kotlin-jackson-1); validated against the Reapit
 * (491 schemas) and OpenAI (1016 schemas) specs same day. Synthesis and
 * sealed-union coverage graduated from the kotlin-debug rig 2026-08-04
 * (compiler- and Jackson-round-trip-verified there).
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { assertEquals, assertStringIncludes } from '@std/assert'
import entry from './mod.ts'

const fixture = JSON.parse(Deno.readTextFileSync(new URL('./test-fixture.json', import.meta.url)))

const generate = (document: unknown = fixture) => {
  return toArtifacts({
    traceId: 'gen-kotlin-jackson-test',
    spanId: 'gen-kotlin-jackson-test',
    document: { type: 'oas', value: document as never },
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

/** A minimal document around the given component schemas. */
const toDocument = (schemas: Record<string, unknown>) => {
  return {
    openapi: '3.0.0',
    info: { title: 'collision-cases', version: '0.0.0' },
    paths: {},
    components: { schemas }
  }
}

Deno.test('every model renders to its own file in the fixed package', () => {
  const { artifacts, manifest } = generate()

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)
  assertEquals(Object.keys(artifacts).toSorted(), [
    'com/example/models/Address.generated.kt',
    'com/example/models/BankTransferPayment.generated.kt',
    'com/example/models/CardPayment.generated.kt',
    'com/example/models/Category.generated.kt',
    'com/example/models/LegacyValue.generated.kt',
    'com/example/models/Order.generated.kt',
    'com/example/models/OrderItem.generated.kt',
    'com/example/models/OrderStatus.generated.kt',
    'com/example/models/PaymentMethod.generated.kt',
    'com/example/models/Settings.generated.kt',
    'com/example/models/StoreCreditPayment.generated.kt',
    'com/example/models/Widget.generated.kt'
  ])
})

Deno.test('property keys that spell structural markers still name their siblings', () => {
  const { artifacts } = generate()

  // `properties`, `items` and `schema` here are USER KEYS, not trail
  // structure — classification is positional (`properties` consumes the
  // following frame as a key), so they contribute their PascalCased
  // selves instead of vanishing or mapping to container segments.
  assertEquals(
    artifacts['com/example/models/Widget.generated.kt'],
    `package com.example.models

data class WidgetProperties(
    val color: String
)

data class WidgetItems(
    val label: String? = null
)

data class Widget(
    val properties: WidgetProperties,
    val items: WidgetItems? = null,
    val schema: String? = null
)
`
  )
})

Deno.test('synthesized name colliding with a component class name fails that subject loudly', () => {
  const { artifacts, manifest } = generate(toDocument({
    Order: {
      type: 'object',
      properties: {
        metadata: { type: 'object', properties: { source: { type: 'string' } } }
      }
    },
    OrderMetadata: {
      type: 'object',
      properties: { unrelated: { type: 'integer' } }
    }
  }))

  // Kotlin redeclaration scope is the PACKAGE: the inline Order.metadata
  // would synthesize `OrderMetadata` beside the real component of that
  // name — two files, one package, no compile. The claim throws instead:
  // Order fails per-item, the component still renders.
  assertEquals(JSON.stringify(manifest.results).includes('error'), true)
  assertEquals(artifacts['com/example/models/Order.generated.kt'], undefined)
  assertStringIncludes(
    artifacts['com/example/models/OrderMetadata.generated.kt'],
    'data class OrderMetadata'
  )
})

Deno.test('two inline schemas converging to one name fail loudly instead of sharing a type', () => {
  const { manifest } = generate(toDocument({
    Order: {
      type: 'object',
      properties: {
        metaData: { type: 'object', properties: { a: { type: 'string' } } },
        meta_data: { type: 'object', properties: { b: { type: 'integer' } } }
      }
    }
  }))

  // Both keys camelCase to `OrderMetaData`. A probe hit on the first
  // claimant's declaration would silently give `meta_data` the WRONG
  // shape — the claim registry throws on the position mismatch instead.
  assertEquals(JSON.stringify(manifest.results).includes('error'), true)
})

Deno.test('a LATE collision drops the model but leaves earlier siblings as orphans', () => {
  const { artifacts, manifest } = generate(toDocument({
    Order: {
      type: 'object',
      properties: {
        good: { type: 'object', properties: { a: { type: 'string' } } },
        metaData: { type: 'object', properties: { b: { type: 'string' } } },
        meta_data: { type: 'object', properties: { c: { type: 'integer' } } }
      }
    }
  }))

  // Siblings declared before the collision are NOT unwound — per-subject
  // isolation never rolls back side effects. The orphans are valid
  // Kotlin dead code; the manifest error on Order is the signal. This
  // pins the declare-then-throw ordering the collision tests above
  // don't reach (their collision lands on the first inline property).
  assertEquals(JSON.stringify(manifest.results).includes('error'), true)

  const orderFile = artifacts['com/example/models/Order.generated.kt']

  assertStringIncludes(orderFile, 'data class OrderGood')
  assertStringIncludes(orderFile, 'data class OrderMetaData')
  assertEquals(orderFile.includes('data class Order('), false)
})

Deno.test('allOf-composed union members qualify — the canonical base-composition idiom', () => {
  // The OpenAPI spec's flagship polymorphism style: shared fields on a
  // base, members compose via allOf, parent is a discriminated oneOf.
  // No generator code handles allOf — core resolves it at PARSE time
  // (mergeIntersection flattens the composition, refs included), so the
  // member peeks as a flat object-with-properties and qualifies. This
  // pin turns that parse-time grace into a guarantee: if core's merge
  // strategy ever changes, this is the test that says so.
  const { artifacts, manifest } = generate(toDocument({
    PetBase: {
      type: 'object',
      required: ['petType', 'name'],
      properties: { petType: { type: 'string' }, name: { type: 'string' } }
    },
    Dog: {
      allOf: [
        { $ref: '#/components/schemas/PetBase' },
        { type: 'object', properties: { barkVolume: { type: 'number' } } }
      ]
    },
    Cat: {
      allOf: [
        { $ref: '#/components/schemas/PetBase' },
        { type: 'object', required: ['indoor'], properties: { indoor: { type: 'boolean' } } }
      ]
    },
    Pet: {
      oneOf: [{ $ref: '#/components/schemas/Dog' }, { $ref: '#/components/schemas/Cat' }],
      discriminator: {
        propertyName: 'petType',
        mapping: { dog: '#/components/schemas/Dog', cat: '#/components/schemas/Cat' }
      }
    }
  }))

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)

  assertEquals(
    artifacts['com/example/models/Pet.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "petType")
@JsonSubTypes(JsonSubTypes.Type(value = Dog::class, name = "dog"), JsonSubTypes.Type(value = Cat::class, name = "cat"))
sealed interface Pet
`
  )

  // The base's fields FLATTEN into each member (data classes cannot
  // extend a base with constructor properties — the sealed interface is
  // the polymorphism seam), the discriminator is omitted, and required
  // propagates through the merge (indoor is non-nullable).
  assertEquals(
    artifacts['com/example/models/Dog.generated.kt'],
    `package com.example.models

data class Dog(
    val name: String,
    val barkVolume: Double? = null
) : Pet
`
  )

  assertStringIncludes(
    artifacts['com/example/models/Cat.generated.kt'],
    'val indoor: Boolean\n) : Pet'
  )

  // The base itself stays a legitimate standalone model.
  assertStringIncludes(
    artifacts['com/example/models/PetBase.generated.kt'],
    'data class PetBase'
  )
})

Deno.test('Order pins the full render (wire names, keyword, optionality, synthesized siblings)', () => {
  const { artifacts } = generate()

  // Order.metadata (inline object) and Order.priority (inline string
  // enum) synthesize as stackTrail-named SIBLING declarations in the
  // same file; the properties reference them by NAME — type position
  // never carries structure (the kotlin-debug synthesis arc).
  assertEquals(
    artifacts['com/example/models/Order.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonProperty

data class OrderMetadata(
    val source: String,
    @JsonProperty("campaign_id")
    val campaignId: String? = null
)

enum class OrderPriority {
    @JsonProperty("low")
    LOW,
    @JsonProperty("normal")
    NORMAL,
    @JsonProperty("high")
    HIGH
}

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
    val customerNotes: String? = null,
    val metadata: OrderMetadata? = null,
    val priority: OrderPriority? = null,
    val payment: PaymentMethod? = null
)
`
  )
})

Deno.test('discriminated union renders a sealed interface with Jackson polymorphic wiring', () => {
  const { artifacts } = generate()

  // Mapped members take their `discriminator.mapping` tag; the unmapped
  // member (StoreCreditPayment) takes the OpenAPI default — its refName.
  assertEquals(
    artifacts['com/example/models/PaymentMethod.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo

/** How the order is paid for. */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "method")
@JsonSubTypes(JsonSubTypes.Type(value = CardPayment::class, name = "card"), JsonSubTypes.Type(value = BankTransferPayment::class, name = "bank_transfer"), JsonSubTypes.Type(value = StoreCreditPayment::class, name = "StoreCreditPayment"))
sealed interface PaymentMethod
`
  )
})

Deno.test('union member declares the supertype and omits the discriminator property', () => {
  const { artifacts } = generate()

  // `method` is required in the schema but OMITTED from the class — the
  // @JsonTypeInfo class discriminator carries it on the wire; a declared
  // property would collide with it.
  assertEquals(
    artifacts['com/example/models/CardPayment.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonProperty

data class CardPayment(
    @JsonProperty("last_four")
    val lastFour: String,
    @JsonProperty("expiry_month")
    val expiryMonth: Int? = null
) : PaymentMethod
`
  )
})

Deno.test('mixed properties + additionalProperties keeps both channels via the catch-all pair', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['com/example/models/Settings.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonAnyGetter
import com.fasterxml.jackson.annotation.JsonAnySetter

/** Arbitrary client settings. */
data class Settings(
    val theme: String,
    @field:JsonAnySetter
    @get:JsonAnyGetter
    val additionalProperties: MutableMap<String, String> = mutableMapOf()
)
`
  )
})

Deno.test('non-qualifying union falls back to the honest wire type', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['com/example/models/LegacyValue.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.databind.JsonNode

typealias LegacyValue = JsonNode
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
