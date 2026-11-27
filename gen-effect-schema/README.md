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
- **Enums**: `Schema.Literals`
- **Modifiers**: optional, nullable
- **References**: `$ref` lands as an import of the target schema, never an
  inline copy
- **Recursion**: a recursive reference is wrapped in `Schema.suspend`, typed
  with the model's type from `@skmtc/gen-typescript` (written to `@/types/`)

## An `allOf` that keeps a `$ref`

The parser merges the members of an `allOf` into one schema, which renders
as one `Schema.Struct`. By default the parser keeps a `$ref` that closes a
cycle, and the schema is then an intersection of the `$ref` and the other
members. Effect has no intersection of schemas, so the run fails, and the
error names the schema. To have the parser merge each `allOf`, set
`settings.parse.intersections` to `"merge"` in `skmtc.config.json`.

## Coerced readings

A peer generator can ask for a model's query-string reading with
`context.insertModel(EffectProjection, refName, { options: { coerce: true } })`.
That writes `<Name>FromString` beside the JSON reading: number and boolean
leaves decode from strings, and arrays accept a lone value. A component name
ending in `FromString` is refused, because it would collide with a twin.

## Options

At `skmtc.config.json#settings.enrichments["@skmtc/gen-effect-schema"]._generator`:

- `defaults` (boolean, default `false`): render a schema's `default` as a
  decoding default (`Schema.withDecodingDefaultType`).

## Customizing

Output paths are fixed in `src/base.ts`. To write elsewhere, clone the generator
(`skmtc clone`) and edit `toExportPath`.

## Naming a model

A model is named from its `refName` (the last segment of its `$ref`). Two
models whose names come out the same, such as `pet` and `Pet`, or refs to
`…/A/properties/disk` and `…/B/properties/disk`, fail the run with
`Registered definition mismatch`. Set `name` on one of them in `skmtc.config.json`:

```jsonc
{
  "settings": {
    "enrichments": {
      "@skmtc/gen-effect-schema": {
        // A component is keyed by its name, any other target by its whole pointer.
        "Pet": { "main": { "name": "upperPet" } },
        "#/components/schemas/B/properties/disk": { "main": { "name": "webServiceDisk" } }
      }
    }
  }
}
```

Write a pointer with no percent escapes: `#/paths/~1x~1{id}/…`, also when the
`$ref` in the document has `%7Bid%7D`.

A model that refers back to itself can also insert gen-typescript's type,
which is named by gen-typescript. If the type's name clashes, set its `name`
under `@skmtc/gen-typescript`, also when you do not list that generator.
