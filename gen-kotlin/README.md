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
with no `SerializersModule`.

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
- Custom scalar overrides (`toKotlinEntry({ scalars })`) swap the type
  text only; non-builtin types also need their import wired via a
  cloned generator.

Architecture notes: `skmtc/notes/lang/19-kotlin-architecture.md` +
`skmtc/notes/lang/22-kotlin-sealed-oneof-architecture.md`.
Language layer: [`@skmtc/lang-kotlin`](https://jsr.io/@skmtc/lang-kotlin).
