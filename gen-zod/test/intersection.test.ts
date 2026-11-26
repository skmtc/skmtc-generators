/**
 * An `allOf` that keeps a `$ref` reaches the router as an intersection. It
 * renders each member, joined with `.and(…)`.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  inheritanceLoopDocument,
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  runE2eFixture,
} from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

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

// The trap: the schemas render and load, as each is `z.lazy`. The first
// parse of one never ends, and the type each is annotated with does not
// compile. gen-typescript, which writes that type, refuses the loop.
Deno.test("a model that is a member of its own union, through an intersection, fails the run by name", () => {
  const { artifacts, manifest } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: inheritanceLoopDocument,
  });

  assertEquals(Object.keys(artifacts), []);
  assertStringIncludes(
    JSON.stringify(manifest.parseIssues),
    "is a member of its own allOf, oneOf or anyOf, with no property between.",
  );
  assertStringIncludes(JSON.stringify(manifest.parseIssues), "#/components/schemas/Card/allOf cannot be rendered");
});
