# @skmtc/gen-zod

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-zod)

OpenAPI to [Zod](https://zod.dev/) schema generator for [Skmtc](https://skm.tc).

Generate type-safe Zod validation schemas from your OpenAPI specifications. Zod is a TypeScript-first schema validation library with static type inference.

- **Fast**: Github OpenAPI to Zod in 0.5sec [(9.5x faster than Orval)](https://github.com/skmtc/openapi-codegen-benchmarks)
- **Modular**: Use by itself or combine with other [Skmtc generators](https://github.com/skmtc/skmtc-generators)
- **Flexible**: Customise output code by editing string templates not ASTs

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

https://github.com/user-attachments/assets/375aedde-aed8-42a3-bd13-3004f736dee7

https://github.com/user-attachments/assets/c830e57a-4767-46e3-b27e-e518c9f6b0d7

## Create project and generate artifacts using CLI

```bash
# Create project
skmtc init <project name>

# Install Zod generator
skmtc install @skmtc/gen-zod <project name>

# Bundle generator code
skmtc bundle <project name>

# Generate artifacts from OpenAPI schema
skmtc generate <project name> <path or url to openapi schema>
```

## Usage Examples

### Basic Primitive Types

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
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
          "score": { "type": "integer" },
          "isActive": { "type": "boolean" }
        },
        "required": ["id", "age", "score", "isActive"]
      }
    }
  }
}
```

</td>
<td valign="top">

```typescript
import { z } from "zod"

export const User = z.object({
  id: z.string(),
  age: z.number(),
  score: z.number().int(),
  isActive: z.boolean()
})
```

</td>
</tr>
</table>

### Optional Properties

Properties not in the `required` array become optional:

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Profile": {
    "type": "object",
    "properties": {
      "username": { "type": "string" },
      "bio": { "type": "string" },
      "website": { "type": "string" }
    },
    "required": ["username"]
  }
}
```

</td>
<td valign="top">

```typescript
export const Profile = z.object({
  username: z.string(),
  bio: z.string().optional(),
  website: z.string().optional()
})
```

</td>
</tr>
</table>

### Enums and Literals

Single enum values become literals, multiple values become z.enum:

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
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
export const Status = z.enum(["active", "inactive", "pending"])
export const Role = z.literal("admin")
```

</td>
</tr>
</table>

### Arrays

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Tags": {
    "type": "array",
    "items": { "type": "string" }
  },
  "Matrix": {
    "type": "array",
    "items": {
      "type": "array",
      "items": { "type": "number" }
    }
  }
}
```

</td>
<td valign="top">

```typescript
export const Tags = z.array(z.string())
export const Matrix = z.array(z.array(z.number()))
```

</td>
</tr>
</table>

### Nested Objects

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Company": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "address": {
        "type": "object",
        "properties": {
          "street": { "type": "string" },
          "city": { "type": "string" }
        },
        "required": ["street", "city"]
      }
    },
    "required": ["name", "address"]
  }
}
```

</td>
<td valign="top">

```typescript
export const Company = z.object({
  name: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string()
  })
})
```

</td>
</tr>
</table>

### Nullable Types

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Article": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "publishedAt": {
        "type": "string",
        "nullable": true
      }
    },
    "required": ["title", "publishedAt"]
  }
}
```

</td>
<td valign="top">

```typescript
export const Article = z.object({
  title: z.string(),
  publishedAt: z.string().nullable()
})
```

</td>
</tr>
</table>

### Union Types

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "StringOrNumber": {
    "anyOf": [
      { "type": "string" },
      { "type": "number" }
    ]
  },
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
export const StringOrNumber = z.union([z.string(), z.number()])

export const Pet = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cat"),
    meow: z.boolean()
  }),
  z.object({
    type: z.literal("dog"),
    bark: z.boolean()
  })
])
```

</td>
</tr>
</table>

### Record Types (Additional Properties)

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Metadata": {
    "type": "object",
    "additionalProperties": { "type": "string" }
  },
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
export const Metadata = z.record(z.string(), z.string())

export const Config = z.object({ id: z.string() }).and(
  z.record(z.string(), z.number())
)
```

</td>
</tr>
</table>

### References and Recursive Types

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "Category": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "parent": { "$ref": "#/components/schemas/Category" }
    },
    "required": ["name"]
  }
}
```

</td>
<td valign="top">

```typescript
export const Category = z.object({
  name: z.string(),
  parent: z.lazy(() => Category).optional()
})
```

</td>
</tr>
</table>

### Type Name Transformations

Schema names are automatically converted to PascalCase:

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>Zod Schema</th>
</tr>
<tr>
<td valign="top">

```json
{
  "user-profile": { "type": "string" },
  "api_response": { "type": "number" },
  "MyType": { "type": "boolean" }
}
```

</td>
<td valign="top">

```typescript
export const UserProfile = z.string()
export const ApiResponse = z.number()
export const MyType = z.boolean()
```

</td>
</tr>
</table>

## Supported Features

- **Primitive types**: string, number, integer, boolean, void, unknown
- **Complex types**: object, array, union (oneOf/anyOf), references ($ref)
- **Modifiers**: nullable (`.nullable()`), optional (`.optional()`)
- **Enums**: Single values (`z.literal()`) and multiple values (`z.enum()`)
- **Integer validation**: Uses `z.number().int()` for integer types
- **Objects**: Nested objects, properties with special characters
- **Additional properties**: Record types (`z.record()`), mixed with regular properties using `.and()`
- **Arrays**: Typed arrays, nested arrays, arrays of objects
- **Unions**: Simple unions and discriminated unions (`z.discriminatedUnion()`)
- **References**: Schema references including recursive types with `z.lazy()`
- **Name transformations**: kebab-case and snake_case to PascalCase

## Testing

Run tests for this generator:

```bash
cd gen-zod && deno task test
```

Or with coverage:

```bash
deno task test:coverage
```

Generate HTML coverage report:

```bash
deno task coverage:html
```

## Support

- [Discord Community](https://discord.gg/skmtc)
- [GitHub Issues](https://github.com/skimah/skmtc-generators/issues)
- [Documentation](https://docs.skm.tc)

## License

[MIT](LICENSE).
