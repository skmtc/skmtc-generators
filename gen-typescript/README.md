# @skmtc/gen-typescript

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-typescript)

OpenAPI to TypeScript type definitions generator for [Skmtc](https://skm.tc).

Generate type-safe TypeScript types, interfaces, and type aliases from your OpenAPI specifications. Perfect for ensuring type safety across your API clients and servers.

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

# Install TypeScript generator
skmtc install @skmtc/gen-typescript <project name>

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
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type User = {
  id: string,
  age: number,
  score: number,
  isActive: boolean
}
```

</td>
</tr>
</table>

### Optional Properties

Properties not in the `required` array become optional:

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type Profile = {
  username: string,
  bio?: string | undefined,
  website?: string | undefined
}
```

</td>
</tr>
</table>

### String Enums and Literal Unions

Single enum values become literals, multiple values become unions:

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type Status = 'active' | 'inactive' | 'pending'
export type Role = 'admin'
```

</td>
</tr>
</table>

### Arrays

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type Tags = Array<string>
export type Matrix = Array<Array<number>>
```

</td>
</tr>
</table>

### Nested Objects

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type Company = {
  name: string,
  address: {
    street: string,
    city: string
  }
}
```

</td>
</tr>
</table>

### Nullable Types

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type Article = {
  title: string,
  publishedAt: string | null
}
```

</td>
</tr>
</table>

### Union Types

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type StringOrNumber = string | number

export type Pet = {
  type: 'cat',
  meow: boolean
} | {
  type: 'dog',
  bark: boolean
}
```

</td>
</tr>
</table>

### Record Types (Additional Properties)

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type Metadata = Record<string, string>

export type Config = {id: string} | Record<string, number>
```

</td>
</tr>
</table>

### References and Recursive Types

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

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
<td>

```typescript
export type Category = {
  name: string,
  parent?: Category | undefined
}
```

</td>
</tr>
</table>

### Type Name Transformations

Schema names are automatically converted to PascalCase:

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

```json
{
  "user-profile": { "type": "string" },
  "api_response": { "type": "number" },
  "MyType": { "type": "boolean" }
}
```

</td>
<td>

```typescript
export type UserProfile = string
export type ApiResponse = number
export type MyType = boolean
```

</td>
</tr>
</table>

### Empty Objects

<table>
<tr>
<th>Input (OpenAPI Schema)</th>
<th>TypeScript</th>
</tr>
<tr>
<td>

```json
{
  "EmptyObject": {
    "type": "object"
  }
}
```

</td>
<td>

```typescript
export type EmptyObject = Record<string, unknown>
```

</td>
</tr>
</table>

## Supported Features

- **Primitive types**: string, number, integer, boolean, null, unknown
- **Complex types**: object, array, union (oneOf/anyOf), references ($ref)
- **Modifiers**: nullable, optional properties, required properties
- **Enums**: Single values (literals) and multiple values (unions)
- **Objects**: Nested objects, empty objects, properties with special characters
- **Additional properties**: Record types, mixed with regular properties
- **Arrays**: Typed arrays, nested arrays, arrays of objects
- **References**: Schema references including recursive types
- **Name transformations**: kebab-case and snake_case to PascalCase

## Testing

Run tests for this generator:

```bash
cd gen-typescript && deno task test
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
