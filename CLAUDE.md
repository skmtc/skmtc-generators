# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Before you write or change a generator

1. **Load the `skmtc-generator` skill and follow it.** It is in the `skmtc`
   repo at `deno/docs/skills/skmtc-generator/`. In a harness that loads no
   skills, read its `SKILL.md`. Do this before a sketch, a ticket or a line of
   code.
2. **Open the twin.** The same class in another package already does the job.
   Copy its shape, names and order.
3. **Render what the parser gives.** A new schema type is one class and one
   router case in each package. Add no function that inspects, repairs, merges
   or compares schemas, and copy no helper file between packages.
4. **A stock generator is an example with sensible defaults.** A rare or
   broken document is the work of whoever clones the generator, or of a parser
   setting. It is not a reason to add code here.
5. **Finish with the skill's `references/finish.md`.** Its
   `scripts/complexity.ts` exits 0 for each package you changed, and your
   report lists each function you added outside a class, with its reason.

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
- `gen-effect-schema` - Effect 4 `Schema` per component
- `gen-effect-http` - Effect 4 HTTP client function per operation (inserts gen-effect-schema)

### Generator Pattern

Each generator follows a consistent pattern:

1. **Entry Point**: Each generator exports a default entry function (e.g., `typescriptEntry`, `zodEntry`) from `src/mod.ts`
2. **Main Projection**: A main class (e.g., `TsProjection`, `ZodProjection`) that handles the transformation
3. **Type Classes**: Individual classes for each output type (e.g., `TsString`, `TsObject`, `ZodString`, `ZodObject`)
4. **Base Class**: Most generators have a base class with common functionality for identifier and export path generation

### Core Dependencies

- `@skmtc/core` - Core framework providing `toModelEntry`, schema types, and transformation context
- Each router maps a schema to its snippet with a `switch` on `schema.type`; its `default` assigns to `never`, so a new schema type is a compile error
- Each generator has its own `deno.json` with name, version, and publish task

### Development Workflow

When modifying generators:
1. Each generator's test command includes necessary permissions (--allow-env, --allow-sys, --allow-read)
2. Generators use the package name from `deno.json` as their identifier
3. The main `deno.json` imports all generators locally and provides a unified publish task

Use US English spelling in code, prose and documentation