# @skmtc/gen-valibot

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-valibot)

OpenAPI to [Valibot](https://valibot.dev/) schema generator for [Skmtc](https://skm.tc).

Generate type-safe Valibot validation schemas from your OpenAPI specifications. Valibot is a modular, lightweight schema library with excellent TypeScript support and tree-shaking capabilities.

## Quick start

Run the deployed generator:

```bash
deno run -A jsr:@skmtc/cli gen --generators "@skmtc/gen-valibot"
```

## Installation

Add to your Skmtc project configuration:

```json
{
  "generators": {
    "@skmtc/gen-valibot": "^0.0.46"
  }
}
```

## Usage Examples

### Basic Types

Given this OpenAPI schema:

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

Generates:

```typescript
import * as v from "valibot"

export const User = v.object({
  id: v.string(),
  age: v.number(),
  isActive: v.optional(v.boolean())
})
```

### Enums and Literals

OpenAPI schema with enums:

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

Generates:

```typescript
export const Status = v.picklist(["active", "inactive", "pending"])
export const Role = v.literal("admin")
```

### Arrays and Nested Objects

OpenAPI schema with complex nesting:

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

Generates:

```typescript
export const Team = v.object({
  name: v.string(),
  members: v.array(v.object({
    id: v.string(),
    role: v.string()
  }))
})
```

### Nullable and Optional Fields

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

Generates:

```typescript
export const Profile = v.object({
  bio: v.nullable(v.string()),
  website: v.optional(v.string())
})
```

### Union Types

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

Generates:

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

### String Formats

OpenAPI string formats are converted to Valibot validations:

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

Generates:

```typescript
export const Event = v.object({
  createdAt: v.pipe(v.string(), v.isoDateTime())
})
```

### Additional Properties

```json
{
  "Metadata": {
    "type": "object",
    "additionalProperties": { "type": "string" }
  }
}
```

Generates:

```typescript
export const Metadata = v.record(v.string(), v.string())
```

With both properties and additionalProperties:

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

Generates:

```typescript
export const Config = v.intersect([
  v.object({ id: v.string() }),
  v.record(v.string(), v.number())
])
```

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
