# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Type Checking
```bash
deno check **/*.ts
```

### Formatting
```bash
deno fmt
```

### Linting
```bash
deno lint
```

### Testing
Run tests for a specific generator:
```bash
cd gen-[generator-name] && deno task test
```

Or run tests with permissions from root:
```bash
deno test --allow-env --allow-sys --allow-read
```

### Publishing
Publish all generators:
```bash
deno task publish
```

## Architecture

This is a Deno workspace containing multiple code generators for the Skmtc framework. Each generator transforms OpenAPI/JSON Schema definitions into specific output formats.

### Workspace Structure

The repository uses Deno workspaces with the following generators:
- `gen-typescript` - TypeScript type definitions
- `gen-zod` - Zod validation schemas
- `gen-msw` - MSW (Mock Service Worker) handlers
- `gen-shadcn-form` - ShadCN form components
- `gen-shadcn-select` - ShadCN select components
- `gen-shadcn-table` - ShadCN table components
- `gen-tanstack-query-fetch-zod` - TanStack Query hooks with fetch and Zod
- `gen-tanstack-query-supabase-zod` - TanStack Query hooks with Supabase and Zod
- `gen-supabase-hono` - Supabase with Hono server routes

### Generator Pattern

Each generator follows a consistent pattern:

1. **Entry Point**: Each generator exports a default entry function (e.g., `typescriptEntry`, `zodEntry`) from `src/mod.ts`
2. **Main Insertable**: A main class (e.g., `TsInsertable`, `ZodInsertable`) that handles the transformation
3. **Type Classes**: Individual classes for each output type (e.g., `TsString`, `TsObject`, `ZodString`, `ZodObject`)
4. **Base Class**: Most generators have a base class with common functionality for identifier and export path generation

### Core Dependencies

- `@skmtc/core` - Core framework providing `toModelEntry`, schema types, and transformation context
- Uses pattern matching (`ts-pattern`) for type mapping
- Each generator has its own `deno.json` with name, version, and publish task

### Development Workflow

When modifying generators:
1. Each generator's test command includes necessary permissions (--allow-env, --allow-sys, --allow-read)
2. Generators use the package name from `deno.json` as their identifier
3. The main `deno.json` imports all generators locally and provides a unified publish task