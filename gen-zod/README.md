# @skmtc/gen-zod

High-quality Zod schema generator for OpenAPI specifications, part of the [Skmtc](https://skm.tc) ecosystem.

## Key Features

**Pure Schema Focus**: Unlike tools that generate bloated client code, gen-zod produces clean, focused Zod schemas without HTTP client overhead.

**Advanced Type Support**:
- ✅ Discriminated unions with automatic detection
- ✅ Records and `additionalProperties` handling
- ✅ Proper optional/nullable modifiers
- ✅ String enums and literals
- ✅ Complex nested objects and arrays
- ✅ Reference resolution across schemas

**Clean Architecture**: Modular design with individual type classes (ZodString, ZodObject, etc.) for maintainable, testable code.

**Framework Agnostic**: Generate schemas that work with any TypeScript project - Next.js, Express, Fastify, or vanilla Node.js.

## Why Choose gen-zod?

| Feature | gen-zod | typed-openapi | Orval | openapi-zod-client |
|---------|---------|---------------|-------|--------------------|
| Schema-only output | ✅ | ❌ (includes client) | ❌ (includes client) | ❌ (includes client) |
| Discriminated unions | ✅ | ❌ | ✅ | ✅ |
| Records support | ✅ | ❌ | ✅ | ✅ |
| Zero config | ✅ | ✅ | ❌ | ✅ |
| File size | Minimal | Small | Large | Large |

## Installation

```bash
# Via JSR (recommended)
deno add @skmtc/gen-zod

# Via npm
npm install @skmtc/gen-zod
```

## Usage

```typescript
import { zodEntry } from '@skmtc/gen-zod'
import { generateFiles } from '@skmtc/core'

// Generate Zod schemas from OpenAPI spec
await generateFiles({
  openApiPath: './api-spec.json',
  outputDir: './generated',
  generators: [zodEntry]
})
```

### Example Output

Input OpenAPI schema:
```json
{
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "required": ["id", "email"],
        "properties": {
          "id": { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "role": { "type": "string", "enum": ["admin", "user"] },
          "profile": { "$ref": "#/components/schemas/Profile" }
        }
      }
    }
  }
}
```

Generated Zod schema:
```typescript
import { z } from 'zod'

export const User = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["admin", "user"]).optional(),
  profile: Profile.optional()
})
```

## Integration

Works seamlessly with other Skmtc generators:

```typescript
import { zodEntry } from '@skmtc/gen-zod'
import { typescriptEntry } from '@skmtc/gen-typescript'
import { mswEntry } from '@skmtc/gen-msw'

// Generate schemas, types, and mocks together
await generateFiles({
  openApiPath: './api-spec.json',
  outputDir: './generated',
  generators: [typescriptEntry, zodEntry, mswEntry]
})
```

## Testing

```bash
deno task test
```

## License

[MIT](LICENSE)