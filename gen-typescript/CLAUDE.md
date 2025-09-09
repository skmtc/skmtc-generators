# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Type Checking
```bash
deno check mod.ts
```

### Formatting
```bash
deno fmt
```

### Linting
```bash
deno lint
```

### Publishing
```bash
deno task publish
```

## Architecture

This is a TypeScript code generator for the Skmtc framework. It transforms schema definitions into TypeScript type definitions.

### Core Components

The generator follows a pattern where each TypeScript type has its own class (e.g., `TsString`, `TsArray`, `TsObject`) that extends from `TypescriptBase`. The main entry point is `typescriptEntry` which uses `TsInsertable` to generate types.

### Key Files

- `mod.ts` - Main exports file
- `src/mod.ts` - Contains the generator entry point (`typescriptEntry`)
- `src/base.ts` - Base class `TypescriptBase` with common functionality for identifier and export path generation
- `src/Ts.ts` - Contains `toTsValue` function that maps schema types to their corresponding TypeScript generator classes
- `src/TsInsertable.ts` - Main insertable class that generates TypeScript types from schemas

### Type Mapping

The `toTsValue` function in `src/Ts.ts` uses pattern matching to convert schema types to their TypeScript equivalents:
- `ref` → `TsRef`
- `array` → `TsArray`
- `object` → `TsObject`
- `union` → `TsUnion`
- `string` → `TsString`
- `number` → `TsNumber`
- `integer` → `TsInteger`
- `boolean` → `TsBoolean`
- `void` → `TsVoid`
- `unknown` → `TsUnknown`

Each type class handles its own serialization and modifier application (nullable, optional, etc.).