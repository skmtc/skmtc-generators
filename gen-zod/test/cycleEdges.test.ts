/**
 * How the cycles of `cycleEdgeDocument` render. `typecheck.test.ts` checks
 * that the files compile and load on zod 4.1.12; this pins the forms.
 */
import { assertStringIncludes } from "@std/assert";
import { cycleEdgeDocument, runE2eFixture } from "@skmtc/test-support";
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

// A reference back has no type yet, so `z.discriminatedUnion` in its own
// getter does not type-check (TS7023, TS2615).
Deno.test("cycle edges - a reference back in a discriminated union renders z.union", () => {
  assertStringIncludes(
    artifacts["src/types/chain.generated.ts"],
    'get next() { return z.union([chain, leaf]).optional() }',
  );
});
