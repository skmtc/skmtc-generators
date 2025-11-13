# @skmtc/gen-valibot

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-valibot)

OpenAPI to [Valibot](https://valibot.dev/) schema generator for [Skmtc](https://skm.tc).

Generate type-safe Valibot validation schemas from your OpenAPI specifications. Valibot is a modular, lightweight schema library with excellent TypeScript support and tree-shaking capabilities.

## Installation

Install Deno

```bash
# On MacOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# On Windows
irm https://deno.land/install.ps1 | iex
```

Install Skmtc

```bash
deno install -g -A --unstable-worker-options jsr:@skmtc/cli@0.0.388 -n skmtc -f
```

## Create project and generate artifacts using TUI (recommended)

```bash
# Create project then Generate artifacts
skmtc
```

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

### Basic Types

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

export const User = v.object({
  id: v.string(),
  age: v.number(),
  isActive: v.optional(v.boolean())
})
```

</td>
</tr>
</table>

### Enums and Literals

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
export const Status = v.picklist(["active", "inactive", "pending"])
export const Role = v.literal("admin")
```

</td>
</tr>
</table>

### Arrays and Nested Objects

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
export const Team = v.object({
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

### Nullable and Optional Fields

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
export const Profile = v.object({
  bio: v.nullable(v.string()),
  website: v.optional(v.string())
})
```

</td>
</tr>
</table>

### Union Types

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
export const Pet = v.union([
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

### String Formats

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
export const Event = v.object({
  createdAt: v.pipe(v.string(), v.isoDateTime())
})
```

</td>
</tr>
</table>

### Additional Properties

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
export const Metadata = v.record(v.string(), v.string())
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
export const Config = v.intersect([
  v.object({ id: v.string() }),
  v.record(v.string(), v.number())
])
```

</td>
</tr>
</table>

## Supported Features

- **Primitive types**: string, number, integer, boolean
- **Complex types**: object, array, union (oneOf/anyOf)
- **Modifiers**: nullable, optional
- **Enums**: Single values (literal) and multiple values (picklist)
- **String formats**: date-time (isoDateTime)
- **Integer validation**: Uses `v.pipe(v.number(), v.integer())`
- **References**: Schema references via `$ref`
- **Additional properties**: Record types and intersections
- **Nested structures**: Deeply nested objects and arrays

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
