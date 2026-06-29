import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { ZodBoolean } from "../../src/ZodBoolean.ts";
import { toGenerateContext } from "../helpers/toGenerateContext.ts";
import { OasBoolean, toGeneratorOnlyKey } from "@skmtc/core";

const generatorKey = toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" });

Deno.test("ZodBoolean - basic boolean type", () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasBoolean(),
    generatorKey,
    destinationPath: "/test",
  });

  assertEquals(zodBoolean.toString(), "z.boolean()");
});

Deno.test("ZodBoolean - nullable boolean", () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: true, nullable: true },
    schema: new OasBoolean(),
    generatorKey,
    destinationPath: "/test",
  });

  assertEquals(zodBoolean.toString(), "z.boolean().nullable()");
});

Deno.test("ZodBoolean - optional boolean", () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: false },
    schema: new OasBoolean(),
    generatorKey,
    destinationPath: "/test",
  });

  assertEquals(zodBoolean.toString(), "z.boolean().optional()");
});

Deno.test("ZodBoolean - optional and nullable boolean", () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: false, nullable: true },
    schema: new OasBoolean(),
    generatorKey,
    destinationPath: "/test",
  });

  assertEquals(zodBoolean.toString(), "z.boolean().nullable().optional()");
});

Deno.test("ZodBoolean - single-value enum [true] emits z.literal(true)", () => {
  // Closes the boolean half of friction #17. A consumer-side
  // discriminated union like `z.discriminatedUnion('isLocked',
  // [z.object({isLocked: z.literal(false), ...}), z.object({isLocked:
  // z.literal(true), lockedBy, ...})])` requires literal-boolean
  // narrowing to recover field-level access after a tag check —
  // emitting `z.boolean()` would erase that.
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasBoolean({ enums: [true] }),
    generatorKey,
    destinationPath: "/test",
  });

  assertEquals(zodBoolean.toString(), "z.literal(true)");
});

Deno.test("ZodBoolean - single-value enum [false] emits z.literal(false)", () => {
  const zodBoolean = new ZodBoolean({
    context: toGenerateContext(),
    modifiers: { required: true },
    schema: new OasBoolean({ enums: [false] }),
    generatorKey,
    destinationPath: "/test",
  });

  assertEquals(zodBoolean.toString(), "z.literal(false)");
});

Deno.test(
  "ZodBoolean - multi-value enum [true, false] falls back to z.boolean()",
  () => {
    // Both-values enum carries no extra info vs an unconstrained
    // boolean. Matches the convention `ZodNumber` uses for the
    // "more than one value" case.
    const zodBoolean = new ZodBoolean({
      context: toGenerateContext(),
      modifiers: { required: true },
      schema: new OasBoolean({ enums: [true, false] }),
      generatorKey,
      destinationPath: "/test",
    });

    assertEquals(zodBoolean.toString(), "z.boolean()");
  },
);

Deno.test(
  "ZodBoolean - literal enum composes with nullable/optional modifiers",
  () => {
    // Modifiers apply uniformly across the `z.literal(...)` and
    // `z.boolean()` paths, so a `enum: [true]` nullable optional
    // schema reads `z.literal(true).nullable().optional()`.
    const zodBoolean = new ZodBoolean({
      context: toGenerateContext(),
      modifiers: { required: false, nullable: true },
      schema: new OasBoolean({ enums: [true] }),
      generatorKey,
      destinationPath: "/test",
    });

    assertEquals(
      zodBoolean.toString(),
      "z.literal(true).nullable().optional()",
    );
  },
);
