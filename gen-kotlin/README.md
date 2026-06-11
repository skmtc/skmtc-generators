# @skmtc/gen-kotlin

Kotlin DTO generator for SKMTC: emits `kotlinx.serialization` data
classes from `components.schemas`.

| Schema shape | Kotlin declaration |
|---|---|
| object with properties | `@Serializable data class` |
| string with enums | `@Serializable enum class` (CONSTANT_CASE entries, `@SerialName` wire values) |
| qualifying discriminated `oneOf` | `@Serializable sealed interface` + `@JsonClassDiscriminator`; members gain ` : Parent`, a `@SerialName` wire tag, and OMIT the discriminator property |
| everything else (primitives, arrays, maps, empty objects, non-qualifying `oneOf`) | `typealias` (non-qualifying `oneOf` → `JsonElement`) |

A `oneOf` **qualifies** when it has a `discriminator`, at least two
members, all members are `$ref`s, and all targets are
object-with-properties schemas. Closed polymorphism is automatic —
`Json.decodeFromString<Animal>(...)` dispatches on the discriminator
with no `SerializersModule`. A union the schema author left
undiscriminated can be upgraded by a consumer-asserted **union hint**
(see Enrichments below) — the hint routes it through the same sealed
machinery, with the asserted property verified against every member.

Inline (nested) objects and string enums synthesize named siblings in
the same file — Kotlin has no anonymous shapes. Optional properties
render `T? = null`; nullable-but-required render `T?`. Wire names that
aren't valid camelCase Kotlin identifiers get `@SerialName`; hard
keywords backtick-escape.

## Usage

The entry is a factory — `basePackage` is required and has no default:

```ts
import { toKotlinEntry } from '@skmtc/gen-kotlin'

export default toKotlinEntry({ basePackage: 'com.example.api' })
```

Point `client.json#settings.basePath` at the Gradle source root
(e.g. `./app/src/main/kotlin`); artifacts land on the
package-=-folder convention
(`app/src/main/kotlin/com/example/api/User.generated.kt`) and each
file's `package` directive is derived from its path.

The consumer project needs `kotlinx-serialization` (plugin +
runtime) on its classpath.

Custom scalars map `format` keys to Kotlin types
(`toKotlinEntry({ scalars: { 'date-time': 'kotlinx.datetime.Instant' } })`).
A DOTTED value renders its simple name AND registers the import — the
consumer only adds the library dependency (kotlinx-datetime types are
natively `@Serializable`).

## Enrichments

Per-model config under
`client.json#settings.enrichments["@skmtc/gen-kotlin"][refName].main`:

- **`name`** — rename a schema-derived identifier
  (`ListCreditNoteEndpoint…Model` → `CreditNotePage`); the alias names
  the identifier, the FILE, every ref site, and supertype clauses.
  Collisions surface through the engine's integrity check.
- **`discriminator: { propertyName }`** — a union hint: assert the
  discriminator the schema omitted, upgrading a qualifying
  undiscriminated union to a sealed interface. For an INLINE union one
  property deep, add `name` to christen the synthesized parent
  (`properties.structure: { name: 'PricingStructure', discriminator: … }`).
  An invalid hint fails the item loudly — never a silent fallback.

Schema `description`s render as KDoc on generated data classes and
sealed interfaces.

## Limits (documented, deliberate)

- Non-qualifying `oneOf` → `typealias Name = JsonElement`:
  undiscriminated unions, inline or primitive members, and inline
  unions of any shape (no refName → can never be sealed). Single-member
  `oneOf`s collapse at parse (core semantics) and never reach the
  generator.
- Sealed membership derives from the document, not the
  `skip`/`include`-filtered set — skipping a parent while generating
  its members leaves a dangling ` : Parent` that fails the consumer
  compile.
- A member claimed by several unions must get the SAME wire tag from
  each (one `@SerialName` per class) — conflicting tags fail the item.
- An object with BOTH `properties` and `additionalProperties` keeps
  the properties; the additional-properties channel is dropped.
- Integer enums are not modeled (`Int`/`Long`).
- A synthesized nested-class name (`UserAddress`) can collide with a
  real schema of the same name in the same package — rename one.
- Custom scalar values are a simple name or ONE dotted path
  (`kotlinx.datetime.Instant`); dotted scalars inside generics are not
  modeled.

Architecture notes: `skmtc/notes/lang/19-kotlin-architecture.md` +
`skmtc/notes/lang/22-kotlin-sealed-oneof-architecture.md` +
`skmtc/notes/lang/26-kotlin-union-hints-architecture.md` +
`skmtc/notes/lang/28-kotlin-naming-enrichments-architecture.md` +
`skmtc/notes/lang/29-kotlin-scalars-and-errors-architecture.md`.
Language layer: [`@skmtc/lang-kotlin`](https://jsr.io/@skmtc/lang-kotlin).
