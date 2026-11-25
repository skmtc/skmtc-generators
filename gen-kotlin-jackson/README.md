# @skmtc/gen-kotlin-jackson

Kotlin models with Jackson annotations, one declaration for each component schema.

## Naming a model

A model is named from its `refName` (the last segment of its `$ref`). Two
models whose names come out the same, such as `pet` and `Pet`, or refs to
`…/A/properties/disk` and `…/B/properties/disk`, fail the run with
`Registered definition mismatch`. Set `name` on one of them in `client.json`:

```jsonc
{
  "settings": {
    "enrichments": {
      "@skmtc/gen-kotlin-jackson": {
        // A component is keyed by its name, any other target by its whole pointer.
        "Pet": { "main": { "name": "UpperPet" } },
        "#/components/schemas/B/properties/disk": { "main": { "name": "WebServiceDisk" } }
      }
    }
  }
}
```

Write a pointer with no percent escapes: `#/paths/~1x~1{id}/…`, also when the
`$ref` in the document has `%7Bid%7D`.
