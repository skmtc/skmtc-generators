# @skmtc/gen-effect-schema

OpenAPI to [Effect](https://effect.website) 4 `Schema` generator for
[Skmtc](https://skm.tc).

Writes one schema per component to `@/schema-effect/<name>.generated.ts`, plus a
barrel at `@/schema-effect/index.generated.ts`. Each schema carries the
PascalCase name of the type it decodes to
(`export const User = Schema.Struct(…)`).

## What it renders

- **Primitives**: string, number (`Schema.Finite`), integer (`Schema.Int`),
  boolean
- **Checks**: string length and pattern; numeric bounds
- **Composites**: object (`Schema.Struct`), array, `additionalProperties`
  (`Schema.Record`), union
- **Enums**: `Schema.Literals`, or open with the `openEnums` option
- **Modifiers**: optional, nullable
- **References**: `$ref` lands as an import of the target schema, never an
  inline copy
- **Recursion**: a recursive reference is wrapped in `Schema.suspend`, typed
  with the model's type from `@skmtc/gen-typescript` (written to `@/types/`)

## Coerced readings

A peer generator can ask for a model's query-string reading with
`context.insertModel(EffectProjection, refName, { options: { coerce: true } })`.
That writes `<Name>FromString` beside the JSON reading: number and boolean
leaves decode from strings, and arrays accept a lone value. A component name
ending in `FromString` is refused, because it would collide with a twin.

## Options

At `client.json#settings.enrichments["@skmtc/gen-effect-schema"]._generator`:

- `defaults` (boolean, default `false`): render a schema's `default` as a
  decoding default (`Schema.withDecodingDefaultType`).
- `openEnums` (boolean, default `false`): render a string enum of two or more
  values as `Schema.Union([Schema.Literals([…]), Schema.String])`, so a value
  the document does not list still decodes. Use it for APIs that add enum values
  without a new version of their document, such as Google's. A one-value enum
  and a number enum stay closed. A recursive model that has an enum this option
  opens is refused, because the type gen-typescript writes for it keeps the enum
  closed.

## Customizing

Output paths are fixed in `src/base.ts`. To write elsewhere, clone the generator
(`skmtc clone`) and edit `toExportPath`.
