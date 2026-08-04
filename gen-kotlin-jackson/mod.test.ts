/**
 * Engine gate for @skmtc/gen-kotlin-jackson: the fixture runs through
 * the REAL pipeline and key artifacts are pinned byte-for-byte.
 * Fixture coverage: snake_case wire keys (@JsonProperty), the hard
 * keyword `object` (backticked, unannotated), enum class with wire
 * mapping, optional/nullable single-?, shared ref (Address x2 -> one
 * definition), self-recursion (Category); inline object/enum synthesis
 * as stackTrail-named declarations in their own models-package files
 * (Order.metadata/Order.priority), the
 * mixed props+additionalProperties catch-all (Settings), a
 * discriminated union as sealed interface + @JsonTypeInfo/@JsonSubTypes
 * (PaymentMethod — mapped tags AND the refName-default tag), member
 * supertype clause + discriminator-property omission, the JsonNode
 * fallback for a non-qualifying union (LegacyValue), and INLINE
 * discriminated unions (stage 2): a component-property union
 * (Order.refund → sealed OrderRefund, members multi-parented) and an
 * operation-position union (/checkout requestBody →
 * CreateApiCheckoutBody) declared through the member-side
 * ensureSealedParent even though NO operation generator runs here.
 *
 * Authored 2026-08-03 via the skmtc-model-v3 + skmtc-lang-kotlin-v3
 * skills (task1k, run kotlin-jackson-1); validated against the Reapit
 * (491 schemas) and OpenAI (1016 schemas) specs same day. Synthesis and
 * sealed-union coverage graduated from the kotlin-debug rig 2026-08-04
 * (compiler- and Jackson-round-trip-verified there).
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { ResultsItem, ResultType } from '@skmtc/core'
import { assertEquals, assertStringIncludes } from '@std/assert'
import entry from './mod.ts'

/**
 * Every `ResultType` leaf in a manifest's results tree — the VALUES
 * only. The tree's keys are subject paths and destination paths, so
 * matching a substring against the serialized tree reports an error for
 * any document whose own names contain one.
 */
const toResultTypes = (results: ResultsItem): ResultType[] => {
  return Object.values(results).flatMap((value) => {
    if (value === null) {
      return []
    }

    if (typeof value === 'string') {
      return [value]
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => (item === null ? [] : toResultTypes(item)))
    }

    return toResultTypes(value)
  })
}

const assertNoResultErrors = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).filter((result) => result === 'error'), [])
}

/** The inverse gate: a run that MUST fail its subjects. */
const assertHasResultError = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).includes('error'), true)
}

const fixture = JSON.parse(Deno.readTextFileSync(new URL('./test-fixture.json', import.meta.url)))

const generate = (document: unknown = fixture) => {
  return toArtifacts({
    traceId: 'gen-kotlin-jackson-test',
    spanId: 'gen-kotlin-jackson-test',
    document: { type: 'oas', value: document as never },
    // basePackage is a REQUIRED generator-scope enrichment (no default —
    // a placeholder package must never ship silently); the fixtures pin
    // com.example.models explicitly.
    settings: {
      basePath: '.',
      enrichments: {
        [entry.id]: { _generator: { basePackage: 'com.example.models' } }
      }
    },
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

  assertNoResultErrors(manifest)
  assertEquals(Object.keys(artifacts).toSorted(), [
    'com/example/models/Address.generated.kt',
    'com/example/models/BankTransferPayment.generated.kt',
    'com/example/models/CardPayment.generated.kt',
    'com/example/models/Category.generated.kt',
    'com/example/models/CreateApiCheckoutBody.generated.kt',
    'com/example/models/LegacyValue.generated.kt',
    'com/example/models/Order.generated.kt',
    'com/example/models/OrderItem.generated.kt',
    'com/example/models/OrderMetadata.generated.kt',
    'com/example/models/OrderPriority.generated.kt',
    'com/example/models/OrderRefund.generated.kt',
    'com/example/models/OrderStatus.generated.kt',
    'com/example/models/PaymentMethod.generated.kt',
    'com/example/models/Settings.generated.kt',
    'com/example/models/StoreCreditPayment.generated.kt',
    'com/example/models/Widget.generated.kt',
    'com/example/models/WidgetItems.generated.kt',
    'com/example/models/WidgetProperties.generated.kt'
  ])
})

Deno.test('basePackage is a REQUIRED enrichment — configured packages land, missing config fails loudly', () => {
  const doc = toDocument({
    Order: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        metadata: { type: 'object', properties: { a: { type: 'string' } } }
      }
    }
  })

  // A real consumer package flows through the ONE path policy —
  // component models AND synthesized declarations alike.
  const configured = toArtifacts({
    traceId: 'gen-kotlin-jackson-test',
    spanId: 'base-package',
    document: { type: 'oas', value: doc as never },
    settings: {
      basePath: '.',
      enrichments: { [entry.id]: { _generator: { basePackage: 'com.acme.orders' } } }
    },
    stackTrail: new StackTrail(['gen', 'test']),
    toGeneratorConfigMap: (() => ({
      [entry.id]: entry
    })) as Parameters<typeof toArtifacts>[0]['toGeneratorConfigMap'],
    startAt: Date.now(),
    silent: true
  })

  assertEquals(Object.keys(configured.artifacts).toSorted(), [
    'com/acme/orders/Order.generated.kt',
    'com/acme/orders/OrderMetadata.generated.kt'
  ])
  assertStringIncludes(
    configured.artifacts['com/acme/orders/Order.generated.kt'],
    'package com.acme.orders'
  )

  // No default: a placeholder package must never ship silently into
  // consumer code, so an unconfigured run fails its subjects loudly.
  const missing = toArtifacts({
    traceId: 'gen-kotlin-jackson-test',
    spanId: 'base-package-missing',
    document: { type: 'oas', value: doc as never },
    settings: undefined,
    stackTrail: new StackTrail(['gen', 'test']),
    toGeneratorConfigMap: (() => ({
      [entry.id]: entry
    })) as Parameters<typeof toArtifacts>[0]['toGeneratorConfigMap'],
    startAt: Date.now(),
    silent: true
  })

  assertHasResultError(missing.manifest)
  assertEquals(Object.keys(missing.artifacts), [])
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

data class Widget(
    val properties: WidgetProperties,
    val items: WidgetItems? = null,
    val schema: String? = null
)
`
  )
  assertStringIncludes(
    artifacts['com/example/models/WidgetProperties.generated.kt'],
    'data class WidgetProperties'
  )
  assertStringIncludes(
    artifacts['com/example/models/WidgetItems.generated.kt'],
    'data class WidgetItems'
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
  assertHasResultError(manifest)
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
  assertHasResultError(manifest)
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
  assertHasResultError(manifest)

  // Synthesized declarations live in their OWN models-package files, so
  // the orphans are whole files. The failed model's own file survives as
  // a header-only stub: the sibling references registered their imports
  // into it before the collision threw (same-package suppression then
  // drops them), and per-subject isolation does not unwind the file
  // entry. Valid Kotlin, dead weight — the manifest error is the signal.
  assertEquals(
    artifacts['com/example/models/Order.generated.kt'],
    'package com.example.models\n'
  )
  assertStringIncludes(
    artifacts['com/example/models/OrderGood.generated.kt'],
    'data class OrderGood'
  )
  assertStringIncludes(
    artifacts['com/example/models/OrderMetaData.generated.kt'],
    'data class OrderMetaData'
  )
})

Deno.test('an inline component-property union synthesizes its sealed parent beside the models', () => {
  const { artifacts } = generate()

  // Order.refund is an ANONYMOUS oneOf — its sealed interface is
  // synthesized under the stackTrail-derived name (the `oneOf` combinator
  // frame is structural and elided) into its OWN models-package file:
  // Kotlin requires sealed subtypes in the parent's package, and the
  // members are component models there. Mapped tag for CardPayment,
  // refName default for the unmapped StoreCreditPayment.
  assertEquals(
    artifacts['com/example/models/OrderRefund.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "method")
@JsonSubTypes(JsonSubTypes.Type(value = CardPayment::class, name = "card"), JsonSubTypes.Type(value = StoreCreditPayment::class, name = "StoreCreditPayment"))
sealed interface OrderRefund
`
  )

  // Type position holds the NAME; a member claimed by several parents
  // implements them all (parent-side tags make multi-parent legal in
  // Jackson — no per-member tag to conflict).
  assertStringIncludes(
    artifacts['com/example/models/Order.generated.kt'],
    'val refund: OrderRefund? = null'
  )
  assertStringIncludes(
    artifacts['com/example/models/StoreCreditPayment.generated.kt'],
    ') : OrderRefund, PaymentMethod'
  )
})

Deno.test('an operation-position union is declared by its MEMBERS when nothing else walks it', () => {
  const { artifacts } = generate()

  // /checkout's requestBody union is claimed by the document scan, but
  // NO operation generator runs in this suite — the only route to the
  // declaration is a member's ensureSealedParent. A ` : Parent` clause
  // over an undeclared parent must be impossible by construction.
  assertEquals(
    artifacts['com/example/models/CreateApiCheckoutBody.generated.kt'],
    `package com.example.models

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "method")
@JsonSubTypes(JsonSubTypes.Type(value = CardPayment::class, name = "CardPayment"), JsonSubTypes.Type(value = BankTransferPayment::class, name = "BankTransferPayment"))
sealed interface CreateApiCheckoutBody
`
  )

  assertStringIncludes(
    artifacts['com/example/models/BankTransferPayment.generated.kt'],
    ') : PaymentMethod, CreateApiCheckoutBody'
  )
})

const sealedProbeSchemas = {
  CardX: {
    type: 'object',
    required: ['kind', 'a'],
    properties: { kind: { type: 'string' }, a: { type: 'string' } }
  },
  BankX: {
    type: 'object',
    required: ['kind', 'b'],
    properties: { kind: { type: 'string' }, b: { type: 'string' } }
  },
  Unrelated: { type: 'object', properties: { x: { type: 'string' } } }
}

const sealedProbeUnion = {
  oneOf: [{ $ref: '#/components/schemas/CardX' }, { $ref: '#/components/schemas/BankX' }],
  discriminator: { propertyName: 'kind' }
}

Deno.test('an underivable-trail union degrades to pre-synthesis behavior — never a document-wide failure', () => {
  // A qualifying union under components/requestBodies carries a trail
  // toSynthesizedName cannot derive. The scan SKIPS it (the shared
  // derivability probe), so members render without a clause and every
  // model — including one with nothing to do with the union — still
  // renders. Deriving eagerly inside the memoized scan would instead
  // throw during EVERY model's construction: zero files, all subjects
  // failed.
  const { artifacts, manifest } = generate({
    openapi: '3.0.0',
    info: { title: 'requestBodies-isolation', version: '0.0.0' },
    paths: {},
    components: {
      schemas: sealedProbeSchemas,
      requestBodies: {
        Checkout: { content: { 'application/json': { schema: sealedProbeUnion } } }
      }
    }
  })

  assertNoResultErrors(manifest)
  assertStringIncludes(artifacts['com/example/models/Unrelated.generated.kt'], 'data class Unrelated')
  assertEquals(artifacts['com/example/models/CardX.generated.kt'].includes(' : '), false)
})

Deno.test('the scan walks webhooks without erupting; underivable webhook trails degrade the same way', () => {
  // core keeps webhooks SEPARATE from operations — the scan must cover
  // them. Webhook trails are not yet derivable, so today this degrades
  // exactly like the requestBodies case (no claims, no clauses, no
  // sealed declaration from EITHER side — both key on the same
  // derivability probe); teaching toSynthesizedName the webhooks root
  // upgrades scan, render site and members in lockstep.
  const { artifacts, manifest } = generate({
    openapi: '3.1.0',
    info: { title: 'webhooks', version: '0.0.0' },
    paths: {},
    webhooks: {
      orderEvent: {
        post: {
          requestBody: { content: { 'application/json': { schema: sealedProbeUnion } } },
          responses: { '200': { description: 'ok' } }
        }
      }
    },
    components: { schemas: sealedProbeSchemas }
  })

  assertNoResultErrors(manifest)
  assertEquals(artifacts['com/example/models/CardX.generated.kt'].includes(' : '), false)
})

Deno.test('a union in a response HEADER is claimed and sealed — full request-surface coverage', () => {
  // Headers (and the parameter `content` alternative) are walkable
  // positions the scan must claim: paths-rooted trails ARE derivable,
  // so the members ensure the sealed parent into existence and declare
  // the supertype — with no operation generator registered.
  const { artifacts, manifest } = generate({
    openapi: '3.0.0',
    info: { title: 'header-union', version: '0.0.0' },
    paths: {
      '/meta': {
        get: {
          responses: {
            '200': { description: 'ok', headers: { 'X-Payment': { schema: sealedProbeUnion } } }
          }
        }
      }
    },
    components: { schemas: sealedProbeSchemas }
  })

  assertNoResultErrors(manifest)
  assertStringIncludes(
    artifacts['com/example/models/GetApiMetaResponseHeadersXPayment.generated.kt'],
    'sealed interface GetApiMetaResponseHeadersXPayment'
  )
  assertStringIncludes(
    artifacts['com/example/models/CardX.generated.kt'],
    ') : GetApiMetaResponseHeadersXPayment'
  )
})

Deno.test('a parameter-position union names by the parameter NAME, never the array index', () => {
  // The trail addresses parameters by ARRAY INDEX (its JSON-Pointer
  // contract — `parameters` is an array in the source document), but an
  // absolute index in a public class name would churn whenever a spec
  // edit reorders parameters. The document-scan lookup resolves the
  // index back to the parameter's NAME — the unrelated `page` parameter
  // ahead of `filter` is here precisely so the derived name proves
  // itself reorder-stable. The trail stays the only positional input;
  // no naming hint is threaded.
  const { artifacts, manifest } = generate({
    openapi: '3.0.0',
    info: { title: 'param-union', version: '0.0.0' },
    paths: {
      '/x': {
        get: {
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'filter', in: 'query', schema: sealedProbeUnion }
          ],
          responses: { '200': { description: 'ok' } }
        }
      }
    },
    components: { schemas: sealedProbeSchemas }
  })

  assertNoResultErrors(manifest)
  assertEquals(
    Object.keys(artifacts).some((path) => /Parameters\d/.test(path)),
    false
  )
  assertStringIncludes(
    artifacts['com/example/models/GetApiXFilter.generated.kt'],
    'sealed interface GetApiXFilter'
  )
  assertStringIncludes(
    artifacts['com/example/models/CardX.generated.kt'],
    ') : GetApiXFilter'
  )
})

Deno.test('a $ref-ed parameter degrades with the rest of the components/<section> family', () => {
  // The ref itself is core's business — `OasOperation.toParams()`
  // resolves it and no generator ever sees an `OasRef<'parameter'>`.
  // What decides the outcome is where the resolved SCHEMA was parsed:
  // under `components/parameters/…`, a root this derivation does not
  // know, so the position is underivable and the union degrades exactly
  // like one under `components/requestBodies` — no claim, no clause, no
  // declaration from either side, no error. The parameter-NAME lookup
  // cannot reach it, and that is one root to teach rather than a
  // parameter-specific gap.
  const { artifacts, manifest } = generate({
    openapi: '3.0.0',
    info: { title: 'ref-param-union', version: '0.0.0' },
    paths: {
      '/x': {
        get: {
          parameters: [{ $ref: '#/components/parameters/Filter' }],
          responses: { '200': { description: 'ok' } }
        }
      }
    },
    components: {
      parameters: { Filter: { name: 'filter', in: 'query', schema: sealedProbeUnion } },
      schemas: sealedProbeSchemas
    }
  })

  assertNoResultErrors(manifest)
  assertEquals(artifacts['com/example/models/GetApiXFilter.generated.kt'], undefined)
  assertEquals(artifacts['com/example/models/CardX.generated.kt'].includes(' : '), false)
})

Deno.test('a HEADER named after a structural marker keeps its own name', () => {
  // `headers` introduces a user-chosen key and consumes it literally —
  // the same positional rule as `properties` — so a header named
  // `items` names `...HeadersItems`, never the array-items marker.
  const { artifacts, manifest } = generate({
    openapi: '3.0.0',
    info: { title: 'header-named-items', version: '0.0.0' },
    paths: {
      '/meta': {
        get: {
          responses: {
            '200': { description: 'ok', headers: { items: { schema: sealedProbeUnion } } }
          }
        }
      }
    },
    components: { schemas: sealedProbeSchemas }
  })

  assertNoResultErrors(manifest)
  assertStringIncludes(
    artifacts['com/example/models/GetApiMetaResponseHeadersItems.generated.kt'],
    'sealed interface GetApiMetaResponseHeadersItems'
  )
})

Deno.test('a COMPONENT named after a structural marker keeps its own name in synthesized siblings', () => {
  // The first frame after components/schemas is a user-chosen component
  // name, consumed positionally — a component named `items` must not be
  // read as the array-items marker (`ItemsNested`, not `ItemNested`).
  const { artifacts, manifest } = generate(toDocument({
    items: {
      type: 'object',
      properties: { nested: { type: 'object', properties: { a: { type: 'string' } } } }
    }
  }))

  assertNoResultErrors(manifest)
  assertStringIncludes(
    artifacts['com/example/models/ItemsNested.generated.kt'],
    'data class ItemsNested'
  )
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

  assertNoResultErrors(manifest)

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
    val payment: PaymentMethod? = null,
    val refund: OrderRefund? = null
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
) : OrderRefund, PaymentMethod, CreateApiCheckoutBody
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
