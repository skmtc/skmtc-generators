/**
 * How the cycles of `cycleEdgeDocument` render. `typecheck.test.ts` checks
 * that the files compile and load on zod 4.1.12; this pins the forms.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { cycleEdgeDocument, runE2eFixture, unionDocument } from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

const { artifacts } = runE2eFixture({
  id: "@skmtc/gen-zod",
  entry: zodEntry,
  document: cycleEdgeDocument,
});

// zod 4.1 to 4.5 read the shape inside `.catchall`, so a getter beside it
// would run at module load.
Deno.test("cycle edges - a model that holds itself beside a record is deferred whole", () => {
  assertStringIncludes(
    artifacts["src/types/node.generated.ts"],
    "export const node: z.ZodType<Node> = z.lazy(() => z.object({name: z.string(), get children() { return z.array(node).optional() }}).catchall(z.string()));",
  );
});

Deno.test("cycle edges - an inline object with a record inside a cycle is deferred by the getter that holds it", () => {
  assertStringIncludes(
    artifacts["src/types/holder.generated.ts"],
    "export const holder = z.object({get meta() { return z.object({get back() { return holder.optional() }}).catchall(z.string()).optional() }});",
  );
});

// On zod 4.1 to 4.5 a getter that returns `z.discriminatedUnion` with the
// model itself as an option does not type-check (TS7023, TS2615).
Deno.test("cycle edges - a union with its own model as a member renders z.union", () => {
  assertStringIncludes(
    artifacts["src/types/chain.generated.ts"],
    'get next() { return z.union([chain, leaf]).optional() }',
  );
});

/** `unionDocument` with its schemas in the reverse order, so a run enters each cycle from its other end. */
const reversedUnionDocument = {
  ...unionDocument,
  components: {
    schemas: Object.fromEntries(Object.entries(unionDocument.components?.schemas ?? {}).reverse()),
  },
};

// The trap: Shape holds Group and Group holds Shape. A run that starts at
// Shape finds Group complete when Shape's union is built; a run that starts
// at Group finds it under construction. A rule that refuses only the member
// under construction renders `z.discriminatedUnion` in the first run and
// `z.union` in the second.
Deno.test("cycle edges - a union with a member in its own cycle renders z.union wherever the run enters the cycle", () => {
  const shapeOf = (document: typeof unionDocument) =>
    runE2eFixture({ id: "@skmtc/gen-zod", entry: zodEntry, document }).artifacts["src/types/shape.generated.ts"];

  assertStringIncludes(
    shapeOf(unionDocument),
    "export const shape: z.ZodType<Shape> = z.lazy(() => z.union([circle, group]));",
  );
  assertEquals(shapeOf(reversedUnionDocument), shapeOf(unionDocument));
});

// Pet's members are outside any cycle, so the rule above leaves it alone.
Deno.test("cycle edges - a union with no member in a cycle stays discriminated", () => {
  const { artifacts: union } = runE2eFixture({ id: "@skmtc/gen-zod", entry: zodEntry, document: unionDocument });

  assertStringIncludes(union["src/types/pet.generated.ts"], "z.discriminatedUnion('type', [cat, dog])");
});
