# @skmtc/gen-arktype

An [ArkType](https://arktype.io) `type` for each component schema.

## Strings

- **Formats**: a format that ArkType has an exact keyword for gets that
  keyword: `string.email`, `string.url`, `string.ip.v4` and `string.ip.v6`.
  `src/formats.ts` lists each format, and says why `date-time`, `date` and
  `uuid` stay `string`.
- **Lengths**: `(1 <= string <= 20)`.
- **Patterns**: a `RegExp` beside the string, `["string", "&", /^a+$/u]`,
  because ArkType's string syntax has no regex flags. The `u` flag is set when
  the pattern compiles with it. A pattern that JavaScript cannot compile is
  not checked. A comment and a warning name it.
- **Enums** drop the format, length and pattern checks: an enum lists every
  value it accepts.

Since 0.3.0 the output checks formats, lengths and patterns, so it is
stricter: a value outside them passed before and fails now.

## Naming a model

A model is named from its `refName` (the last segment of its `$ref`). Two
models whose names come out the same, such as `pet` and `Pet`, or refs to
`…/A/properties/disk` and `…/B/properties/disk`, fail the run with
`Registered definition mismatch`. Set `name` on one of them in `skmtc.config.json`:

```jsonc
{
  "settings": {
    "enrichments": {
      "@skmtc/gen-arktype": {
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
