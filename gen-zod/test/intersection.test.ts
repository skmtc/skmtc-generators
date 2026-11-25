/** How an `allOf` that keeps a ref renders (#117). `typecheck.test.ts` checks that the files compile and what they parse. */
import { assertStringIncludes } from "@std/assert";
import {
  intersectionCycleDocument,
  intersectionDocument,
  intersectionMembersDocument,
  keepAllRefs,
  loopDocument,
  loopError,
  requiredLoopDocument,
  requiredLoopError,
  runE2eFixture,
  toRunError,
} from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

const id = "@skmtc/gen-zod";
const entry = zodEntry;

const { artifacts } = runE2eFixture({ id, entry, document: intersectionDocument, system: keepAllRefs });
const { artifacts: members } = runE2eFixture({ id, entry, document: intersectionMembersDocument, system: keepAllRefs });
const { artifacts: cycles } = runE2eFixture({ id, entry, document: intersectionCycleDocument });

Deno.test("intersection - a ref and an object", () => {
  assertStringIncludes(
    artifacts["src/types/pet.generated.ts"],
    "export const pet = animal.and(z.object({name: z.string().optional()}));",
  );
});

Deno.test("intersection - a nullable one in a property", () => {
  assertStringIncludes(
    artifacts["src/types/owner.generated.ts"],
    "pet: z.object({name: z.string().optional()}).and(animal).nullable().optional()",
  );
});

Deno.test("intersection - a discriminated union of intersections renders z.union", () => {
  assertStringIncludes(artifacts["src/types/payment.generated.ts"], "export const payment = z.union([card, bank]);");
});

Deno.test("intersection - more than two members", () => {
  assertStringIncludes(
    members["src/types/noted.generated.ts"],
    "export const noted = animal.and(z.unknown()).and(marker);",
  );
});

Deno.test("intersection - a key that one member requires and another declares is required", () => {
  assertStringIncludes(
    members["src/types/named.generated.ts"],
    "export const named = animal.and(z.object({kind: z.string()}));",
  );
});

// Without the check, the stack overflows.
Deno.test("intersection - a required property that holds the intersection fails and is named", () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: requiredLoopDocument })), requiredLoopError);
});

// The trap: `.and` reads the type of `node`, which a getter does not defer
// (TS7022), so the model is annotated.
Deno.test("intersection - a ref that closes a cycle through a property", () => {
  assertStringIncludes(
    cycles["src/types/node.generated.ts"],
    "export const node: z.ZodType<Node> = z.object({name: z.string(), get children() { return z.array(z.lazy(() => node).and(z.object({extra: z.string().optional()}))) }});",
  );
});

Deno.test("intersection - a ref that closes a cycle in the model itself", () => {
  assertStringIncludes(
    cycles["src/types/sub.generated.ts"],
    "export const sub: z.ZodType<Sub> = z.lazy(() => base).and(z.object({name: z.string().optional()}));",
  );
});

Deno.test("intersection - additionalProperties: false is left out", () => {
  assertStringIncludes(
    cycles["src/types/closed.generated.ts"],
    "z.lazy(() => base).and(z.object({b: z.string().optional()}));",
  );
});

// A model typed `z.ZodType<T>` is not an option of `z.discriminatedUnion` (TS2322).
Deno.test("intersection - a discriminated union with an annotated model renders z.union", () => {
  assertStringIncludes(cycles["src/types/pair.generated.ts"], "export const pair = z.union([tree, leaf]);");
});

Deno.test("intersection - an inheritance loop fails and is named", () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: loopDocument })), loopError);
});
