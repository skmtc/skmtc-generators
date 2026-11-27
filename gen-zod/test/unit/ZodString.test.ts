import { assertEquals } from "@std/assert";
import { ZodString } from "../../src/ZodString.ts";
import { OasString } from "@skmtc/core";
import { toGenerateContext } from "../helpers/toGenerateContext.ts";
import { toGeneratorOnlyKey } from "@skmtc/core";
import type { Modifiers } from "@skmtc/core";
import { formatSchemas } from "../../src/formats.ts";

Deno.test("ZodString - basic string type", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString(),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string()");
});

Deno.test("ZodString - single enum value", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ enums: ["value1"], format: undefined }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.literal('value1')");
});

Deno.test("ZodString - multiple enum values", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({
      enums: ["val1", "val2", "val3"],
      format: undefined,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.enum(['val1', 'val2', 'val3'])");
});

Deno.test("ZodString - nullable string", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString(),
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().nullable()");
});

Deno.test("ZodString - optional string", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString(),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().optional()");
});

Deno.test("ZodString - optional and nullable string", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString(),
    modifiers: { required: false, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().nullable().optional()");
});

Deno.test("ZodString - with minLength", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({
      enums: undefined,
      format: undefined,
      minLength: 5,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().min(5)");
});

Deno.test("ZodString - with maxLength", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({
      enums: undefined,
      format: undefined,
      maxLength: 100,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().max(100)");
});

Deno.test("ZodString - maxLength 0 keeps its check", () => {
  // The trap: 0 is falsy, and a schema with it accepts only the empty string.
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({ maxLength: 0 }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().max(0)");
});

Deno.test("ZodString - with minLength and maxLength", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({
      enums: undefined,
      format: undefined,
      minLength: 5,
      maxLength: 100,
    }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().min(5).max(100)");
});

Deno.test("ZodString - with minLength and maxLength and optional", () => {
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({
      enums: undefined,
      format: undefined,
      minLength: 5,
      maxLength: 100,
    }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.string().min(5).max(100).optional()");
});

Deno.test("ZodString - an enum drops its length checks, which z.enum has no method for", () => {
  // Cloudflare's firewall mode: `enum` beside `maxLength: 12` rendered
  // `z.enum([…]).max(12)`, which fails to type-check (TS2339).
  const zodString = new ZodString({
    context: toGenerateContext(),
    stringSchema: new OasString({
      enums: ["block", "challenge"],
      format: undefined,
      maxLength: 12,
    }),
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodString.toString(), "z.enum(['block', 'challenge']).optional()");
});

const toZodString = (stringSchema: OasString, modifiers: Modifiers = { required: true }) =>
  new ZodString({
    context: toGenerateContext(),
    stringSchema,
    modifiers,
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

// Written out, not read from `formatSchemas`, so a wrong entry there fails.
const mappedFormats: Array<[string, string]> = [
  // The trap: RFC 3339 allows an offset, and z.iso.datetime() refuses one
  // without `offset: true`.
  ["date-time", "z.iso.datetime({ offset: true })"],
  ["date", "z.iso.date()"],
  ["duration", "z.iso.duration()"],
  ["email", "z.email()"],
  ["uri", "z.url()"],
  ["uuid", "z.guid()"],
  ["ipv4", "z.ipv4()"],
  ["ipv6", "z.ipv6()"],
];

for (const [format, expected] of mappedFormats) {
  Deno.test(`ZodString - format ${format} renders ${expected}`, () => {
    assertEquals(toZodString(new OasString({ format })).toString(), expected);
  });
}

Deno.test("ZodString - every format in formatSchemas has a test", () => {
  assertEquals([...formatSchemas.keys()].sort(),mappedFormats.map(([format]) => format).sort());
});

Deno.test("ZodString - a format Zod 4 has no check for stays z.string()", () => {
  assertEquals(toZodString(new OasString({ format: "uri-template" })).toString(), "z.string()");
});

// The trap: a format name such as `constructor` is a key of every object.
Deno.test("ZodString - a format named after an Object.prototype key stays z.string()", () => {
  assertEquals(toZodString(new OasString({ format: "constructor" })).toString(), "z.string()");
});

Deno.test("ZodString - a format keeps its length checks and modifiers", () => {
  const zodString = toZodString(
    new OasString({ format: "email", minLength: 3, maxLength: 20 }),
    { required: false, nullable: true },
  );

  assertEquals(zodString.toString(), "z.email().min(3).max(20).nullable().optional()");
});

Deno.test("ZodString - a pattern renders .regex() with the u flag", () => {
  assertEquals(
    toZodString(new OasString({ pattern: "^[a-z/]+$" })).toString(),
    "z.string().regex(/^[a-z/]+$/u)",
  );
});

Deno.test("ZodString - a pattern valid only without the u flag renders without it", () => {
  assertEquals(
    toZodString(new OasString({ pattern: "^a\\-b$" })).toString(),
    "z.string().regex(/^a\\-b$/)",
  );
});

Deno.test("ZodString - a pattern comes after the format and the lengths", () => {
  assertEquals(
    toZodString(new OasString({ format: "email", maxLength: 20, pattern: "@example\\.com$" })).toString(),
    "z.email().max(20).regex(/@example\\.com$/u)",
  );
});

Deno.test("ZodString - a pattern JavaScript rejects is left out, with a comment", () => {
  assertEquals(
    toZodString(new OasString({ pattern: "(?i)abc" })).toString(),
    "/**\n * pattern '(?i)abc' is not a JavaScript regex, so it is not checked\n */\nz.string()",
  );
});

Deno.test("ZodString - an enum drops its format and pattern checks", () => {
  assertEquals(
    toZodString(new OasString({ enums: ["a@example.com", "b@example.com"], format: "email", pattern: "^x" }))
      .toString(),
    "z.enum(['a@example.com', 'b@example.com'])",
  );
});
