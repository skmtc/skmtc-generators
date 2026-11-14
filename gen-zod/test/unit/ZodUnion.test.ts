import { assertEquals } from "@std/assert";
import { ZodUnion } from "../../src/ZodUnion.ts";
import {
  OasBoolean,
  OasDiscriminator,
  OasNumber,
  OasObject,
  OasString,
} from "@skmtc/core";
import { toGenerateContext } from "../helpers/toGenerateContext.ts";
import { toGeneratorOnlyKey } from "@skmtc/core";

Deno.test("ZodUnion - simple union with two types", () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber(),
    ],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(zodUnion.toString(), "z.union([z.string(), z.number()])");
});

Deno.test("ZodUnion - union with three types", () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber(),
      new OasBoolean(),
    ],
    discriminator: undefined,
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodUnion.toString(),
    "z.union([z.string(), z.number(), z.boolean()])",
  );
});

Deno.test("ZodUnion - nullable union", () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber(),
    ],
    discriminator: undefined,
    modifiers: { required: true, nullable: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodUnion.toString(),
    "z.union([z.string(), z.number()]).nullable()",
  );
});

Deno.test("ZodUnion - optional union", () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasString({ enums: undefined, format: undefined }),
      new OasNumber(),
    ],
    discriminator: undefined,
    modifiers: { required: false },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodUnion.toString(),
    "z.union([z.string(), z.number()]).optional()",
  );
});

Deno.test("ZodUnion - union with discriminator", () => {
  const zodUnion = new ZodUnion({
    context: toGenerateContext(),
    members: [
      new OasObject({
        properties: {
          type: new OasString({ enums: ["cat"], format: undefined }),
          meow: new OasBoolean(),
        },
        required: ["type", "meow"],
        additionalProperties: undefined,
      }),
      new OasObject({
        properties: {
          type: new OasString({ enums: ["dog"], format: undefined }),
          bark: new OasBoolean(),
        },
        required: ["type", "bark"],
        additionalProperties: undefined,
      }),
    ],
    discriminator: new OasDiscriminator({ propertyName: "type" }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

  assertEquals(
    zodUnion.toString(),
    'z.discriminatedUnion("type", [z.object({type: z.literal("cat"), meow: z.boolean()}), z.object({type: z.literal("dog"), bark: z.boolean()})])',
  );
});

const toPet = (
  { kind, nullable, kindEnums }: {
    kind: string;
    nullable?: boolean;
    kindEnums?: string[];
  },
) =>
  new OasObject({
    nullable,
    properties: {
      type: new OasString({ enums: kindEnums ?? [kind], format: undefined }),
      [kind]: new OasBoolean(),
    },
    required: ["type", kind],
    additionalProperties: undefined,
  });

const toPetUnion = (members: OasObject[]) =>
  new ZodUnion({
    context: toGenerateContext(),
    members,
    discriminator: new OasDiscriminator({ propertyName: "type" }),
    modifiers: { required: true },
    generatorKey: toGeneratorOnlyKey({ generatorId: "@skmtc/gen-zod" }),
    destinationPath: "/test",
  });

// zod 4 types z.discriminatedUnion's options as objects: `.nullable()` on
// one fails to type-check (TS2322, Cloudflare's `pages_env_vars`).
Deno.test("ZodUnion - a discriminator with a nullable member renders z.union", () => {
  assertEquals(
    toPetUnion([toPet({ kind: "cat", nullable: true }), toPet({ kind: "dog" })])
      .toString(),
    'z.union([z.object({type: z.literal("cat"), cat: z.boolean()}).nullable(), z.object({type: z.literal("dog"), dog: z.boolean()})])',
  );
});

// zod 4 reads each option's literal values for the key when it first
// parses, and throws "Invalid discriminated union option" when one has none
// (seven of Cloudflare's discriminated unions).
Deno.test("ZodUnion - a discriminator whose property holds no literal renders z.union", () => {
  const plain = new OasObject({
    properties: { type: new OasString({ enums: undefined, format: undefined }) },
    required: ["type"],
    additionalProperties: undefined,
  });

  assertEquals(
    toPetUnion([plain, toPet({ kind: "dog" })]).toString(),
    'z.union([z.object({type: z.string()}), z.object({type: z.literal("dog"), dog: z.boolean()})])',
  );
});

Deno.test("ZodUnion - a discriminator with a member holding a record renders z.union", () => {
  const withRecord = new OasObject({
    properties: { type: new OasString({ enums: ["bag"], format: undefined }) },
    required: ["type"],
    additionalProperties: new OasString({ enums: undefined, format: undefined }),
  });

  assertEquals(
    toPetUnion([withRecord, toPet({ kind: "dog" })]).toString(),
    'z.union([z.object({type: z.literal("bag")}).catchall(z.string()), z.object({type: z.literal("dog"), dog: z.boolean()})])',
  );
});

Deno.test("ZodUnion - a discriminator over enums of several values stays discriminated", () => {
  assertEquals(
    toPetUnion([toPet({ kind: "cat", kindEnums: ["cat", "kitten"] }), toPet({ kind: "dog" })])
      .toString(),
    'z.discriminatedUnion("type", [z.object({type: z.enum(["cat", "kitten"]), cat: z.boolean()}), z.object({type: z.literal("dog"), dog: z.boolean()})])',
  );
});
