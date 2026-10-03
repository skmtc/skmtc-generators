/**
 * Engine gate for the skeleton (and for your generator once the slots
 * are filled): the fixture below runs through the REAL pipeline and the
 * rendered artifacts are pinned byte-for-byte. After customizing a
 * slot, update the pinned strings to your target syntax — the
 * structural assertions (files exist, shared refs dedup, imports
 * stitched, recursion annotated) must keep passing unchanged.
 *
 * Fixture coverage: enum, array-of-ref, shared ref (Address ×2 →
 * ONE definition), optional, nullable, additionalProperties record,
 * self-recursion (Category → Category, beside a `CategoryType` enum),
 * mutual recursion (Node → Edge → Node), and query parameters that ref a scalar, an enum, an object and a
 * ref-through-ref (Paged → PageSize).
 */
import {
  emptyEnrichmentSchema,
  StackTrail,
  toArtifacts,
  toEndpointName,
  toGeneratorOnlyKey,
  toOasOperationEntry,
} from '@skmtc/core'
import type {
  Enrichments,
  OasOperationProjectionConstructorArgs,
} from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { assertEquals, assertStringIncludes } from '@std/assert'
import effectSchemaEntry, { EffectObject } from '../mod.ts'
import type { EnrichmentSchema } from './enrichments.ts'

const fixture = {
  openapi: '3.0.3',
  info: { title: 'Skeleton fixture', version: '0.0.1' },
  paths: {
    '/orders': {
      get: {
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { $ref: '#/components/schemas/PageSize' },
          },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/OrderStatus' },
          },
          {
            name: 'filter',
            in: 'query',
            schema: { $ref: '#/components/schemas/Filter' },
          },
          {
            name: 'paged',
            in: 'query',
            schema: { $ref: '#/components/schemas/Paged' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'ok' } },
      },
    },
  },
  components: {
    schemas: {
      Order: {
        type: 'object',
        required: ['id', 'status', 'items'],
        properties: {
          id: { type: 'string' },
          status: { $ref: '#/components/schemas/OrderStatus' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          shippingAddress: { $ref: '#/components/schemas/Address' },
          billingAddress: { $ref: '#/components/schemas/Address' },
          notes: { type: 'string', nullable: true },
        },
      },
      OrderItem: {
        type: 'object',
        required: ['sku', 'quantity'],
        properties: {
          sku: { type: 'string' },
          quantity: { type: 'integer', default: 1 },
          unitPrice: { type: 'number' },
        },
      },
      OrderStatus: {
        type: 'string',
        enum: ['pending', 'shipped', 'delivered'],
      },
      Address: {
        type: 'object',
        required: ['line1', 'city'],
        properties: {
          line1: { type: 'string' },
          city: { type: 'string' },
        },
      },
      Category: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          kind: { $ref: '#/components/schemas/CategoryType' },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/Category' },
          },
        },
      },
      // Named as an unmarked alias of Category's type would be.
      CategoryType: { type: 'string', enum: ['leaf', 'branch'] },
      Node: {
        type: 'object',
        required: ['edges'],
        properties: {
          edges: {
            type: 'array',
            items: { $ref: '#/components/schemas/Edge' },
          },
        },
      },
      Edge: {
        type: 'object',
        required: ['to'],
        properties: {
          to: { $ref: '#/components/schemas/Node' },
        },
      },
      Metadata: { type: 'object', additionalProperties: { type: 'string' } },
      Filter: {
        type: 'object',
        required: ['radius'],
        properties: {
          radius: { type: 'integer', enum: [25, 50, 100] },
          weight: { type: 'number', enum: [0.5, 1] },
          exact: { type: 'boolean', enum: [true] },
          tier: { type: 'string', enum: ['gold', 'silver'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      PageSize: { type: 'integer', minimum: 1 },
      Paged: {
        type: 'object',
        properties: {
          limit: { $ref: '#/components/schemas/PageSize' },
          status: { $ref: '#/components/schemas/OrderStatus' },
        },
      },
    },
  },
}

type GenerateOptions = {
  /** The document, when a test needs one the fixture is not. */
  document?: typeof fixture
  /** This generator's `_generator` scope: `defaults`. */
  generator?: EnrichmentSchema['generator']
  /** Run the query-params consumer below alongside, as a route generator would. */
  withQuery?: boolean
}

/**
 * A stand-in for a route generator: one operation's query parameters as a
 * coerced `EffectObject`, the way a server generator would build a
 * `<Handler>Query`. It is what sends a `$ref` through `EffectRef` under
 * `coerce`, and so what asks this generator for a model's `FromString`
 * twin through the projection's options.
 */
const QueryBase = toTsOasOperationProjectionBase({
  id: '@test/query',
  toIdentifierName: ({ operation }) => `${toEndpointName(operation)}Query`,
  toIdentifierType: () => ({ type: 'variable' }),
  toExportPath: () => '@/api/query.generated.ts',
  toEnrichmentSchema: () => emptyEnrichmentSchema,
})

class QueryProjection extends QueryBase {
  value: EffectObject

  constructor(
    { context, operation, settings }: OasOperationProjectionConstructorArgs<
      Enrichments
    >,
  ) {
    super({ context, operation, settings })

    this.value = new EffectObject({
      context,
      destinationPath: settings.exportPath,
      objectSchema: operation.toParametersObject(['query']),
      modifiers: { required: true },
      generatorKey: toGeneratorOnlyKey({ generatorId: '@test/query' }),
      coerce: true,
    })
  }

  override toString(): string {
    return `${this.value}`
  }
}

const queryEntry = toOasOperationEntry({
  id: '@test/query',
  toEnrichmentSchema: () => emptyEnrichmentSchema,
  transform({ context, operation, variant }) {
    context.insertOperation({ projection: QueryProjection, operation, variant })
  },
})

const generate = (
  {
    document = fixture,
    generator,
    withQuery,
  }: GenerateOptions = {},
) => {
  return toArtifacts({
    traceId: 'skeleton-test',
    spanId: 'skeleton-test',
    // The fixture is a plain literal; the OpenAPI document type is only
    // asserted here, in test code.
    document: { type: 'oas', value: document as never },
    settings: {
      basePath: '.',
      enrichments: {
        [effectSchemaEntry.id]: generator === undefined
          ? {}
          : { _generator: generator },
      },
    },
    stackTrail: new StackTrail(['skeleton', 'test']),
    // The same shape the CLI's generated server uses. The cast bridges
    // the config map's caller-chosen EnrichmentType generic — test-only.
    toGeneratorConfigMap: (() => ({
      [effectSchemaEntry.id]: effectSchemaEntry,
      ...(withQuery ? { [queryEntry.id]: queryEntry } : {}),
    })) as Parameters<typeof toArtifacts>[0]['toGeneratorConfigMap'],
    startAt: Date.now(),
    silent: true,
  })
}

Deno.test('every model renders to its own file', () => {
  const { artifacts, manifest } = generate()

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)

  const paths = Object.keys(artifacts).toSorted()

  assertEquals(paths, [
    'schema-effect/address.generated.ts',
    'schema-effect/category.generated.ts',
    'schema-effect/categoryType.generated.ts',
    'schema-effect/edge.generated.ts',
    'schema-effect/filter.generated.ts',
    'schema-effect/index.generated.ts',
    'schema-effect/metadata.generated.ts',
    'schema-effect/node.generated.ts',
    'schema-effect/order.generated.ts',
    'schema-effect/orderItem.generated.ts',
    'schema-effect/orderStatus.generated.ts',
    'schema-effect/pageSize.generated.ts',
    'schema-effect/paged.generated.ts',
    // A recursive model pulls its TypeScript type through gen-typescript,
    // which is what annotates its `Schema.suspend` — and the types it reaches.
    'types/category.generated.ts',
    'types/categoryType.generated.ts',
    'types/edge.generated.ts',
    'types/node.generated.ts',
  ])
})

Deno.test('refs land as imported names, not inline expansions', () => {
  const { artifacts } = generate()

  const order = artifacts['schema-effect/order.generated.ts']

  // The import header is the first thing to check: a missing import
  // means a string swallowed a snippet.
  assertStringIncludes(order, `import {Schema} from 'effect'`)
  assertStringIncludes(
    order,
    `import {Address} from '@/schema-effect/address.generated.ts'`,
  )

  // Shared ref: two uses, one definition, referenced by NAME.
  assertEquals(
    order.match(/shippingAddress: Schema.optional\(Address\)/g)?.length,
    1,
  )
  assertEquals(
    order.match(/billingAddress: Schema.optional\(Address\)/g)?.length,
    1,
  )
  assertEquals(order.includes('line1'), false)
})

Deno.test('order model pins the full render', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['schema-effect/order.generated.ts'],
    `import {Schema} from 'effect'
import {OrderStatus} from '@/schema-effect/orderStatus.generated.ts'
import {OrderItem} from '@/schema-effect/orderItem.generated.ts'
import {Address} from '@/schema-effect/address.generated.ts'

export const Order = Schema.Struct({id: Schema.String, status: OrderStatus, items: Schema.mutable(Schema.Array(OrderItem)), shippingAddress: Schema.optional(Address), billingAddress: Schema.optional(Address), notes: Schema.optional(Schema.NullOr(Schema.String))});
`,
  )
})

Deno.test('self-recursion suspends with the type from gen-typescript', () => {
  const { artifacts } = generate()

  // The annotation that breaks TS7022 sits on the suspend callback, so
  // the export itself stays a fully typed Struct. The type is aliased:
  // unaliased, it merges with the `export const` of the same name (TS2395).
  // The alias is marked with `$`, which no component name can carry — the
  // fixture's `CategoryType` enum imports beside it under its own name.
  assertEquals(
    artifacts['schema-effect/category.generated.ts'],
    `import {Schema} from 'effect'
import {CategoryType} from '@/schema-effect/categoryType.generated.ts'
import type {Category as Category$Type} from '@/types/category.generated.ts'

export const Category = Schema.Struct({name: Schema.String, kind: Schema.optional(CategoryType), children: Schema.optional(Schema.mutable(Schema.Array(Schema.suspend((): Schema.Codec<Category$Type> => Category))))});
`,
  )
})

Deno.test('mutual recursion imports the value it suspends, beside the aliased type', () => {
  const { artifacts } = generate()

  assertEquals(
    artifacts['schema-effect/edge.generated.ts'],
    `import {Schema} from 'effect'
import {Node} from '@/schema-effect/node.generated.ts'
import type {Node as Node$Type} from '@/types/node.generated.ts'

export const Edge = Schema.Struct({to: Schema.suspend((): Schema.Codec<Node$Type> => Node)});
`,
  )
  assertStringIncludes(
    artifacts['schema-effect/node.generated.ts'],
    `import {Edge} from '@/schema-effect/edge.generated.ts'`,
  )
})

Deno.test('additionalProperties renders as a record', () => {
  const { artifacts } = generate()

  assertStringIncludes(
    artifacts['schema-effect/metadata.generated.ts'],
    'Schema.Record(Schema.String, Schema.String)',
  )
})

Deno.test('enum and modifiers render at the leaf', () => {
  const { artifacts } = generate()

  assertStringIncludes(
    artifacts['schema-effect/orderStatus.generated.ts'],
    `Schema.Literals(["pending", "shipped", "delivered"])`,
  )
  assertStringIncludes(
    artifacts['schema-effect/orderItem.generated.ts'],
    'quantity: Schema.Int, unitPrice: Schema.optional(Schema.Finite)',
  )
})

Deno.test("a coerced ref lands as the target's FromString twin, built once beside the JSON reading", () => {
  const { artifacts, manifest } = generate({ withQuery: true })

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)

  const query = artifacts['api/query.generated.ts']

  // The twin is a definition of its own, imported by name — never an
  // inline expansion — and the inline leaf beside it coerces too. A
  // target of strings (OrderStatus) needs none and reads the JSON one.
  assertStringIncludes(
    query,
    `import {PageSizeFromString} from '@/schema-effect/pageSizeFromString.generated.ts'
import {OrderStatus} from '@/schema-effect/orderStatus.generated.ts'
import {FilterFromString} from '@/schema-effect/filterFromString.generated.ts'
import {PagedFromString} from '@/schema-effect/pagedFromString.generated.ts'`,
  )
  assertStringIncludes(
    query,
    'export const GetApiOrdersQuery = Schema.Struct({limit: Schema.optional(PageSizeFromString), status: Schema.optional(OrderStatus), filter: Schema.optional(FilterFromString), paged: Schema.optional(PagedFromString), page: Schema.optional(Schema.NumberFromString.check(Schema.isInt()))});',
  )

  // The twin decodes from the string a URL carries, keeps the target's
  // checks, and is in the barrel like any other model.
  assertEquals(
    artifacts['schema-effect/pageSizeFromString.generated.ts'],
    `import {Schema} from 'effect'

export const PageSizeFromString = Schema.NumberFromString.check(Schema.isInt()).check(Schema.isGreaterThanOrEqualTo(1));
`,
  )
  assertStringIncludes(
    artifacts['schema-effect/index.generated.ts'],
    `{ PageSizeFromString } from '@/schema-effect/pageSizeFromString.generated.ts'`,
  )

  // The JSON reading is untouched by its twin.
  assertStringIncludes(
    artifacts['schema-effect/pageSize.generated.ts'],
    'export const PageSize = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));',
  )
})

Deno.test('a coerced ref to an object coerces its leaves, lone values and enums through the string they arrive as', () => {
  const { artifacts, manifest } = generate({ withQuery: true })

  assertEquals(JSON.stringify(manifest.results).includes('error'), false)

  const filter = artifacts['schema-effect/filterFromString.generated.ts']

  assertStringIncludes(
    filter,
    `import {Schema, SchemaTransformation} from 'effect'`,
  )
  assertStringIncludes(
    filter,
    'radius: Schema.NumberFromString.check(Schema.isInt()).pipe(Schema.decodeTo(Schema.Literals([25, 50, 100]), SchemaTransformation.passthrough({ strict: false })))',
  )
  assertStringIncludes(
    filter,
    'weight: Schema.optional(Schema.FiniteFromString.pipe(Schema.decodeTo(Schema.Literals([0.5, 1]), SchemaTransformation.passthrough({ strict: false }))))',
  )
  assertStringIncludes(
    filter,
    'exact: Schema.optional(Schema.Literals(["true", "false"]).pipe(Schema.decodeTo(Schema.Boolean, SchemaTransformation.transform({ decode: (value) => value === "true", encode: (value) => (value ? "true" : "false") }))).pipe(Schema.decodeTo(Schema.Literal(true), SchemaTransformation.passthrough({ strict: false }))))',
  )
  // A string enum arrives as itself; a list off a query string takes a
  // lone value as one.
  assertStringIncludes(
    filter,
    'tier: Schema.optional(Schema.Literals(["gold", "silver"])), tags: Schema.optional(Schema.ArrayEnsure(Schema.String))',
  )
  // `main` is untouched.
  assertStringIncludes(
    artifacts['schema-effect/filter.generated.ts'],
    'radius: Schema.Literals([25, 50, 100]), weight: Schema.optional(Schema.Literals([0.5, 1])), exact: Schema.optional(Schema.Literal(true))',
  )
})

Deno.test('a target of strings gets no twin, wherever it is reffed from', () => {
  const { artifacts } = generate({ withQuery: true })

  assertEquals(
    'schema-effect/orderStatusFromString.generated.ts' in
      artifacts,
    false,
  )
  assertEquals(
    artifacts['schema-effect/index.generated.ts'].includes(
      'OrderStatusFromString',
    ),
    false,
  )
})

Deno.test('a ref on the way to a twin passes coerce on, and only as far as it is needed', () => {
  const { artifacts } = generate({ withQuery: true })

  assertEquals(
    artifacts['schema-effect/pagedFromString.generated.ts'],
    `import {PageSizeFromString} from '@/schema-effect/pageSizeFromString.generated.ts'
import {OrderStatus} from '@/schema-effect/orderStatus.generated.ts'
import {Schema} from 'effect'

export const PagedFromString = Schema.Struct({limit: Schema.optional(PageSizeFromString), status: Schema.optional(OrderStatus)});
`,
  )
})

Deno.test('a recursive target reffed from a parameter is refused, not emitted', () => {
  const { artifacts, manifest } = generate({
    withQuery: true,
    document: {
      ...fixture,
      paths: {
        '/orders': {
          get: {
            ...fixture.paths['/orders'].get,
            parameters: [
              {
                name: 'category',
                in: 'query',
                schema: { $ref: '#/components/schemas/Category' },
              },
            ],
          },
        },
      },
    },
  })

  // The failure is the parameter's item. (A leaf registered before the
  // throw leaves the twin's file behind — engine behaviour on any throw.)
  assertStringIncludes(
    JSON.stringify(manifest.results),
    '"/orders%3Aget":{"variant%3A main":"error"}',
  )
  assertEquals(
    artifacts['schema-effect/categoryFromString.generated.ts']
      .includes('export const'),
    false,
  )
})

Deno.test('a component named with the reserved suffix is refused by name', () => {
  const { manifest } = generate({
    document: {
      ...fixture,
      components: {
        schemas: {
          ...fixture.components.schemas,
          DateFromString: { type: 'string' },
        },
      },
    } as never,
  })

  // The failure is the item's own, not a definition mismatch on `Date`.
  assertStringIncludes(
    JSON.stringify(manifest.results),
    '"DateFromString":{"variant%3A main":"error"}',
  )
})

Deno.test('a default is decoded in only where the project asks for it', () => {
  const withDefaults = generate({ generator: { defaults: true } }).artifacts[
    'schema-effect/orderItem.generated.ts'
  ]
  const without = generate().artifacts[
    'schema-effect/orderItem.generated.ts'
  ]

  assertStringIncludes(withDefaults, `import {Schema, Effect} from 'effect'`)
  assertStringIncludes(
    withDefaults,
    'quantity: Schema.Int.pipe(Schema.withDecodingDefaultType(Effect.succeed(1)))',
  )
  // Off by default: a default is not decoded in.
  assertStringIncludes(without, 'quantity: Schema.Int,')
  assertEquals(without.includes('Effect'), false)
})
