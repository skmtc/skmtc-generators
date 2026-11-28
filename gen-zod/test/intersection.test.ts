/**
 * An `allOf` that keeps a `$ref` reaches the router as an intersection. It
 * renders each member, joined with `.and(…)`.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { OasIntersection, OasObject } from "@skmtc/core";
import {
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  objectOneOfCycleDocument,
  runE2eFixture,
} from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";
import { toZodValue } from "../src/Zod.ts";
import { toGenerateContext } from "./helpers/toGenerateContext.ts";

const renderIntersection = (members: OasIntersection["members"]): string =>
  `${
    toZodValue({
      schema: new OasIntersection({ members }),
      destinationPath: "/test",
      required: true,
      context: toGenerateContext(),
    })
  }`;

// skmtc-generators#151: core keeps a `oneOf` member that closes a cycle as
// the parent's empty object and the ref. The open empty object constrains
// nothing, so it is left out; a closed one stays.
Deno.test("an open empty object beside a oneOf member that closes a cycle is left out", () => {
  const { artifacts } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: objectOneOfCycleDocument,
  });

  assertStringIncludes(
    artifacts["src/types/field.generated.ts"],
    "export const field: z.ZodType<Field> = z.lazy(() => z.union([z.object({type: z.literal('string')}), arrayField]));",
  );
});

Deno.test("a closed empty object beside a oneOf member that closes a cycle stays", () => {
  const { artifacts } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: objectOneOfCycleDocument,
  });

  assertStringIncludes(
    artifacts["src/types/closedField.generated.ts"],
    "z.object({}).and(closedArrayField)",
  );
});

Deno.test("an intersection with no member left renders z.unknown()", () => {
  assertEquals(renderIntersection([]), "z.unknown()");
  assertEquals(renderIntersection([new OasObject({ properties: {} })]), "z.unknown()");
});

Deno.test("a ref and an object render as an intersection of the two", () => {
  const { artifacts } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: intersectionDocument,
    system: keepAllRefs,
  });

  assertEquals(
    artifacts["src/types/pet.generated.ts"],
    `import {animal} from '@/types/animal.generated.ts'\nimport {z} from 'zod'\n\nexport const pet = animal.and(z.object({name: z.string().optional()}));\n`,
  );
});

// The trap: zod throws "Invalid discriminated union option" for an
// intersection, when the union first parses. The parsed union says that it
// is not discriminable, so `z.union` renders.
Deno.test("a discriminated union of intersections renders as a plain union", () => {
  const { artifacts } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: intersectionDocument,
    system: keepAllRefs,
  });

  assertStringIncludes(
    artifacts["src/types/payment.generated.ts"],
    "export const payment = z.union([card, bank]);",
  );
});

// The property's getter defers the ref inside the intersection, as it
// defers any ref in a cycle. A model that is an intersection has no
// property on the way, so the whole model is `z.lazy`.
Deno.test("a ref that closes a cycle is deferred inside the intersection", () => {
  const { artifacts } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: intersectionCycleDocument,
  });

  assertStringIncludes(
    artifacts["src/types/node.generated.ts"],
    "export const node = z.object({name: z.string(), get children() { return z.array(node.and(z.object({extra: z.string().optional()}))) }});",
  );
  assertStringIncludes(
    artifacts["src/types/closed.generated.ts"],
    "export const closed: z.ZodType<Closed> = z.lazy(() => base.and(z.object({b: z.string().optional()})));",
  );
});
