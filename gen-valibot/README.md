# @skmtc/gen-valibot

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-valibot)

OpenAPI to [Valibot](https://valibot.dev/) schema generator for [Skmtc](https://skm.tc).

## Supported Features

- **Primitive types**: string, number, integer, boolean
- **Complex types**: object, array, union (oneOf/anyOf)
- **Modifiers**: nullable, optional
- **Enums**: Single values (literal) and multiple values (picklist)
- **String formats**: A format that valibot has an action for gets that
  action, such as `v.email()` or `v.isoTimestamp()`. `src/formats.ts` lists
  each format. Every other format, such as `duration` or `uri-template`, is
  `v.string()`. Since 0.3.0, `date-time` is `v.isoTimestamp()`: the
  `v.isoDateTime()` of earlier releases refused an RFC 3339 date-time.
- **Lengths**: `v.minLength()` and `v.maxLength()`.
- **Patterns**: `v.regex()`, with the `u` flag when the pattern compiles with
  it. A pattern that JavaScript cannot compile is not checked. A comment and a
  warning name it.
- **Enums** drop the format, length and pattern checks: an enum lists every
  value it accepts.
- **Integer validation**: Uses `v.pipe(v.number(), v.integer())`
- **References**: Schema references via `$ref`
- **Additional properties**: Record types and intersections
- **Nested structures**: Deeply nested objects and arrays

## Getting started

### Install Skmtc

```bash
deno install -g -A --unstable-worker-options jsr:@skmtc/cli -n skmtc -f
```

**Skmtc** runs on [Deno](https://deno.com). You can install it using 
- `curl -fsSL https://deno.land/install.sh | sh` on MacOS/Linux
- `irm https://deno.land/install.ps1 | iex` on Windows

### Create project and generate artifacts using TUI

```bash
skmtc
```

![](assets/demo.gif)

## Create project and generate artifacts using CLI

```bash
# Create project
skmtc init <project name>

# Install Valibot generator
skmtc install @skmtc/gen-valibot <project name>

# Bundle generator code
skmtc bundle <project name>

# Generate artifacts from OpenAPI schema
skmtc generate <project name> <path or url to openapi schema>
```

## Usage Examples

<details>
<summary><h3>Basic Types</h3></summary>

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "age": { "type": "number" },
          "isActive": { "type": "boolean" }
        },
        "required": ["id", "age"]
      }
    }
  }
}
```

</td>
<td valign="top">

```typescript
import * as v from "valibot"

export const user = v.object({
  id: v.string(),
  age: v.number(),
  isActive: v.optional(v.boolean())
})
```

</td>
</tr>
</table>

</details>

<details>
<summary><h3>Enums and Literals</h3></summary>

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Status": {
    "type": "string",
    "enum": ["active", "inactive", "pending"]
  },
  "Role": {
    "type": "string",
    "enum": ["admin"]
  }
}
```

</td>
<td valign="top">

```typescript
export const status = v.picklist(["active", "inactive", "pending"])
export const role = v.literal("admin")
```

</td>
</tr>
</table>

</details>

<details>
<summary><h3>Arrays and Nested Objects</h3></summary>

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Team": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "members": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "role": { "type": "string" }
          },
          "required": ["id", "role"]
        }
      }
    },
    "required": ["name", "members"]
  }
}
```

</td>
<td valign="top">

```typescript
export const team = v.object({
  name: v.string(),
  members: v.array(v.object({
    id: v.string(),
    role: v.string()
  }))
})
```

</td>
</tr>
</table>

</details>

<details>
<summary><h3>Nullable and Optional Fields</h3></summary>

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Profile": {
    "type": "object",
    "properties": {
      "bio": {
        "type": "string",
        "nullable": true
      },
      "website": { "type": "string" }
    },
    "required": ["bio"]
  }
}
```

</td>
<td valign="top">

```typescript
export const profile = v.object({
  bio: v.nullable(v.string()),
  website: v.optional(v.string())
})
```

</td>
</tr>
</table>

</details>

<details>
<summary><h3>Union Types</h3></summary>

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Pet": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["cat"] },
          "meow": { "type": "boolean" }
        },
        "required": ["type", "meow"]
      },
      {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["dog"] },
          "bark": { "type": "boolean" }
        },
        "required": ["type", "bark"]
      }
    ]
  }
}
```

</td>
<td valign="top">

```typescript
export const pet = v.union([
  v.object({
    type: v.literal("cat"),
    meow: v.boolean()
  }),
  v.object({
    type: v.literal("dog"),
    bark: v.boolean()
  })
])
```

</td>
</tr>
</table>

</details>

<details>
<summary><h3>String Formats</h3></summary>

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Event": {
    "type": "object",
    "properties": {
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": ["createdAt"]
  }
}
```

</td>
<td valign="top">

```typescript
export const event = v.object({
  createdAt: v.pipe(v.string(), v.isoTimestamp())
})
```

</td>
</tr>
</table>

</details>

<details>
<summary><h3>Additional Properties</h3></summary>

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Metadata": {
    "type": "object",
    "additionalProperties": { "type": "string" }
  }
}
```

</td>
<td valign="top">

```typescript
export const metadata = v.record(v.string(), v.string())
```

</td>
</tr>
</table>

With both properties and additionalProperties:

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Valibot Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Config": {
    "type": "object",
    "properties": {
      "id": { "type": "string" }
    },
    "required": ["id"],
    "additionalProperties": { "type": "number" }
  }
}
```

</td>
<td valign="top">

```typescript
export const config = v.intersect([
  v.object({ id: v.string() }),
  v.record(v.string(), v.number())
])
```

</td>
</tr>
</table>

</details>

## Testing

Run tests for this generator:

```bash
cd gen-valibot && deno task test
```

Or with coverage:

```bash
deno task test:coverage
```

## Support

- [Discord Community](https://discord.gg/skmtc)
- [GitHub Issues](https://github.com/skimah/skmtc-generators/issues)
- [Documentation](https://docs.skm.tc)

## License

[MIT](LICENSE).

## Naming a model

A model is named from its `refName` (the last segment of its `$ref`). Two
models whose names come out the same, such as `pet` and `Pet`, or refs to
`…/A/properties/disk` and `…/B/properties/disk`, fail the run with
`Registered definition mismatch`. Set `name` on one of them in `skmtc.config.json`:

```jsonc
{
  "settings": {
    "enrichments": {
      "@skmtc/gen-valibot": {
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
