# @skmtc/gen-typescript Test Suite

This test suite provides comprehensive coverage for the TypeScript generator, demonstrating how JSON Schema is converted to TypeScript types.

## Running Tests

```bash
deno task test
```

## Test Structure

Each test file focuses on a specific aspect of the TypeScript generation:

### Basic Types (`basic-types.test.ts`)
- String, number, boolean, integer, void, unknown types
- Demonstrates the simplest JSON Schema → TypeScript mappings

### String Types (`string-types.test.ts`) 
- String enums and literals
- Format handling (email, date-time, etc.)
- Nullable and optional string modifiers

### Integer Types (`integer-types.test.ts`)
- Integer types with different formats (int32, int64)
- Integer enums and literals
- Nullable integer handling

### Array Types (`array-types.test.ts`)
- Arrays with different item types
- Array modifier handling (nullable, optional)
- Nested array structures

### Object Types (`object-types.test.ts`)
- Objects with properties and required fields
- Record types with additionalProperties
- Mixed object + record types

### Union Types (`union-types.test.ts`)
- oneOf/anyOf union patterns
- Discriminated unions with propertyName
- Complex nested union types

### Reference Types (`reference-types.test.ts`)
- $ref reference handling
- Reference type modifiers
- Circular reference patterns

### Utility Types (`utility-types.test.ts`)
- void, unknown, never, null types
- Type class properties and behavior

### Integration (`integration.test.ts`)
- Complex nested schemas
- TsInsertable class integration
- Entry point configuration

## Output Format

Tests output clear mappings in TypeBox documentation style:

```
┌─────────────────────────────┬─────────────────────┐
│ JSON Schema                 │ TypeScript Type     │
├─────────────────────────────┼─────────────────────┤
│ {"type": "string"}          │ string              │
│ {"type": "number"}          │ number              │
└─────────────────────────────┴─────────────────────┘
```

This format makes it easy to see exactly how each JSON Schema pattern translates to TypeScript.