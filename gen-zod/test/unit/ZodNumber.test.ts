import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { ZodNumber } from "../../src/ZodNumber.ts";
import { toGenerateContext } from "../helpers/toGenerateContext.ts";
import { OasNumber, toGeneratorOnlyKey } from "@skmtc/core";

Deno.test("ZodNumber - basic number type", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber(),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number()");
});

Deno.test("ZodNumber - nullable number", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    schema: new OasNumber(),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().nullable()");
});

Deno.test("ZodNumber - optional number", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false },
    schema: new OasNumber(),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().optional()");
});

Deno.test("ZodNumber - optional and nullable number", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    schema: new OasNumber(),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().nullable().optional()");
});

Deno.test("ZodNumber - with minimum (non-exclusive)", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 5 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(5)");
});

Deno.test("ZodNumber - with maximum (non-exclusive)", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ maximum: 100 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().lte(100)");
});

Deno.test("ZodNumber - with minimum and maximum", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 5, maximum: 100 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(5).lte(100)");
});

Deno.test("ZodNumber - with minimum (exclusive)", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 5, exclusiveMinimum: true }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gt(5)");
});

Deno.test("ZodNumber - with maximum (exclusive)", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ maximum: 100, exclusiveMaximum: true }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().lt(100)");
});

Deno.test("ZodNumber - with multipleOf", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ multipleOf: 0.5 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().multipleOf(0.5)");
});

Deno.test("ZodNumber - with minimum, maximum, and optional", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false },
    schema: new OasNumber({ minimum: 5, maximum: 100 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(5).lte(100).optional()");
});

Deno.test("ZodNumber - with all constraints combined", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 0, maximum: 100, multipleOf: 0.1 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodNumber.toString(),
    "z.number().gte(0).lte(100).multipleOf(0.1)",
  );
});

// Enum handling tests
Deno.test("ZodNumber - single enum value", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ enums: [3.14] }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.literal(3.14)");
});

Deno.test("ZodNumber - multiple enum values", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ enums: [0.5, 1.0, 1.5] }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodNumber.toString(),
    "z.union([z.literal(0.5), z.literal(1), z.literal(1.5)])",
  );
});

Deno.test("ZodNumber - enum with null", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ enums: [1.5, 2.5, null] }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodNumber.toString(),
    "z.union([z.literal(1.5), z.literal(2.5), z.literal(null)])",
  );
});

Deno.test("ZodNumber - single enum with nullable", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    schema: new OasNumber({ enums: [3.14] }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.literal(3.14).nullable()");
});

Deno.test("ZodNumber - single enum with optional", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false },
    schema: new OasNumber({ enums: [3.14] }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.literal(3.14).optional()");
});

Deno.test("ZodNumber - multiple enum with nullable and optional", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    schema: new OasNumber({ enums: [0.5, 1.5] }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodNumber.toString(),
    "z.union([z.literal(0.5), z.literal(1.5)]).nullable().optional()",
  );
});

Deno.test("ZodNumber - enum with constraints (should ignore constraints)", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ enums: [1.5, 2.5], minimum: 5, maximum: 100 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodNumber.toString(),
    "z.union([z.literal(1.5), z.literal(2.5)])",
  );
});

// Nullable + Constraints tests
Deno.test("ZodNumber - nullable with minimum", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    schema: new OasNumber({ minimum: 5 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(5).nullable()");
});

Deno.test("ZodNumber - nullable with maximum", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    schema: new OasNumber({ maximum: 100 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().lte(100).nullable()");
});

Deno.test("ZodNumber - nullable with multipleOf", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    schema: new OasNumber({ multipleOf: 0.5 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().multipleOf(0.5).nullable()");
});

Deno.test("ZodNumber - nullable with all constraints", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    schema: new OasNumber({ minimum: 0, maximum: 100, multipleOf: 0.1 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodNumber.toString(),
    "z.number().gte(0).lte(100).multipleOf(0.1).nullable()",
  );
});

Deno.test("ZodNumber - nullable and optional with constraints", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    schema: new OasNumber({ minimum: 5, maximum: 100 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodNumber.toString(),
    "z.number().gte(5).lte(100).nullable().optional()",
  );
});

// Exclusive boundary combinations
Deno.test("ZodNumber - both exclusive boundaries", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({
      minimum: 5,
      exclusiveMinimum: true,
      maximum: 100,
      exclusiveMaximum: true,
    }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gt(5).lt(100)");
});

Deno.test("ZodNumber - exclusive minimum with non-exclusive maximum", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 5, exclusiveMinimum: true, maximum: 100 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gt(5).lte(100)");
});

Deno.test("ZodNumber - non-exclusive minimum with exclusive maximum", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 5, maximum: 100, exclusiveMaximum: true }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(5).lt(100)");
});

// Edge cases
Deno.test("ZodNumber - negative range", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: -100, maximum: -5 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(-100).lte(-5)");
});

Deno.test("ZodNumber - decimal boundaries", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 0.5, maximum: 99.5 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(0.5).lte(99.5)");
});

Deno.test("ZodNumber - zero boundaries", () => {
  const zodNumber = new ZodNumber({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasNumber({ minimum: 0, maximum: 0 }),
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodNumber.toString(), "z.number().gte(0).lte(0)");
});
