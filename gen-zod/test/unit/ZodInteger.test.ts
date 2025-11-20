import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { ZodInteger } from "../../src/ZodInteger.ts";
import { OasInteger } from "@skmtc/core";
import { toGenerateContext } from "../helpers/toGenerateContext.ts";
import { toGeneratorOnlyKey } from "@skmtc/core";

Deno.test("ZodInteger - basic integer type", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int()");
});

Deno.test("ZodInteger - with format", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: "int32" }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int()");
});

Deno.test("ZodInteger - nullable integer", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().nullable()");
});

Deno.test("ZodInteger - optional integer", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().optional()");
});

Deno.test("ZodInteger - with minimum (non-exclusive)", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, minimum: 5 }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gte(5)");
});

Deno.test("ZodInteger - with maximum (non-exclusive)", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, maximum: 100 }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().lte(100)");
});

Deno.test("ZodInteger - with minimum and maximum", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, minimum: 5, maximum: 100 }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gte(5).lte(100)");
});

Deno.test("ZodInteger - with minimum (exclusive)", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      minimum: 5,
      exclusiveMinimum: true,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gt(5)");
});

Deno.test("ZodInteger - with maximum (exclusive)", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      maximum: 100,
      exclusiveMaximum: true,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().lt(100)");
});

Deno.test("ZodInteger - with multipleOf", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, multipleOf: 10 }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().multipleOf(10)");
});

Deno.test("ZodInteger - with minimum, maximum, and optional", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, minimum: 5, maximum: 100 }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.number().int().gte(5).lte(100).optional()",
  );
});

Deno.test("ZodInteger - with all constraints combined", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      minimum: 0,
      maximum: 100,
      multipleOf: 5,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.number().int().gte(0).lte(100).multipleOf(5)",
  );
});

// Enum handling tests
Deno.test("ZodInteger - single enum value", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, enums: [42] }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.literal(42)");
});

Deno.test("ZodInteger - multiple enum values", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, enums: [1, 2, 3] }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.union([z.literal(1), z.literal(2), z.literal(3)])",
  );
});

Deno.test("ZodInteger - enum with null", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, enums: [1, 2, null] }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.union([z.literal(1), z.literal(2), z.literal(null)])",
  );
});

Deno.test("ZodInteger - single enum with nullable", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, enums: [42] }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.literal(42).nullable()");
});

Deno.test("ZodInteger - single enum with optional", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, enums: [42] }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.literal(42).optional()");
});

Deno.test("ZodInteger - multiple enum with nullable and optional", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, enums: [1, 2] }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.union([z.literal(1), z.literal(2)]).nullable().optional()",
  );
});

Deno.test("ZodInteger - enum with constraints (should ignore constraints)", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      enums: [1, 2],
      minimum: 5,
      maximum: 100,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.union([z.literal(1), z.literal(2)])");
});

// Nullable + Constraints tests
Deno.test("ZodInteger - nullable with minimum", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, minimum: 5 }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gte(5).nullable()");
});

Deno.test("ZodInteger - nullable with maximum", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, maximum: 100 }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().lte(100).nullable()");
});

Deno.test("ZodInteger - nullable with multipleOf", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, multipleOf: 10 }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.number().int().multipleOf(10).nullable()",
  );
});

Deno.test("ZodInteger - nullable with all constraints", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      minimum: 0,
      maximum: 100,
      multipleOf: 5,
    }),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.number().int().gte(0).lte(100).multipleOf(5).nullable()",
  );
});

Deno.test("ZodInteger - nullable and optional with constraints", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, minimum: 5, maximum: 100 }),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodInteger.toString(),
    "z.number().int().gte(5).lte(100).nullable().optional()",
  );
});

// Exclusive boundary combinations
Deno.test("ZodInteger - both exclusive boundaries", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      minimum: 5,
      exclusiveMinimum: true,
      maximum: 100,
      exclusiveMaximum: true,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gt(5).lt(100)");
});

Deno.test("ZodInteger - exclusive minimum with non-exclusive maximum", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      minimum: 5,
      exclusiveMinimum: true,
      maximum: 100,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gt(5).lte(100)");
});

Deno.test("ZodInteger - non-exclusive minimum with exclusive maximum", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({
      format: undefined,
      minimum: 5,
      maximum: 100,
      exclusiveMaximum: true,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gte(5).lt(100)");
});

// Edge cases
Deno.test("ZodInteger - negative range", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, minimum: -100, maximum: -5 }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gte(-100).lte(-5)");
});

Deno.test("ZodInteger - format int64", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: "int64" }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int()");
});

Deno.test("ZodInteger - zero boundaries", () => {
  const zodInteger = new ZodInteger({
    context: toGenerateContext(),
    schema: new OasInteger({ format: undefined, minimum: 0, maximum: 0 }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodInteger.toString(), "z.number().int().gte(0).lte(0)");
});
