# @skmtc/gen-zod

![Coverage](https://raw.githubusercontent.com/skmtc/skmtc-generators/gh-pages/badges/gen-zod/coverage.svg)

Zod schema generator for OpenAPI specifications, part of the [Skmtc](https://skm.tc) ecosystem.

## Advanced Type Support

- ✅ Discriminated unions with automatic detection
- ✅ Records and `additionalProperties` handling
- ✅ Proper optional/nullable modifiers
- ✅ String enums and literals
- ✅ Complex nested objects and arrays
- ✅ Reference resolution across schemas

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
# Run tests
deno task test

# Run tests with coverage
deno task test:coverage

# Generate coverage report
deno task coverage:report

# View detailed coverage
deno task coverage:check

# Generate HTML coverage report
deno task coverage:html
```

## Coverage

Current test coverage is automatically tracked and displayed in the badge above. The coverage is **project-specific** - it only includes files from the `gen-zod` package, not the entire repository.

The coverage report includes:

- **Line Coverage**: Percentage of code lines executed during tests
- **Function Coverage**: Percentage of functions called during tests
- **Branch Coverage**: Percentage of code branches taken during tests

Coverage reports are generated using Deno's built-in coverage tools and updated automatically via GitHub Actions. Each generator in the Skmtc ecosystem maintains its own independent coverage tracking.

## License

[MIT](LICENSE)