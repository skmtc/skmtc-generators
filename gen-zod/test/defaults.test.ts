/**
 * Pins how `applyDefaults` renders a schema's `default`. The typecheck task
 * checks that the files compile and parse; this runs in the default task.
 */
import { assertEquals, assertThrows } from "@std/assert";
import * as v from "valibot";
import { defaultDocument, runE2eFixture } from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";
import { enrichmentSchema } from "../src/enrichments.ts";

const generate = (generator?: { applyDefaults?: boolean }) =>
  runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: defaultDocument,
    enrichments: generator === undefined ? undefined : { _generator: generator },
  }).artifacts;

const repo = "src/types/repo.generated.ts";

Deno.test("defaults - applyDefaults renders .default() on a boolean, a string and an integer", () => {
  const artifacts = generate({ applyDefaults: true });

  assertEquals(
    artifacts[repo],
    `import {z} from 'zod'

export const repo = z.object({name: z.string(), archived: z.boolean().default(false), visibility: z.string().default("public"), per_page: z.number().int().default(30)});
`,
  );
});

Deno.test("defaults - a required key, an array and a nullable key keep their default", () => {
  const artifacts = generate({ applyDefaults: true });

  assertEquals(
    artifacts["src/types/job.generated.ts"],
    `import {z} from 'zod'

export const job = z.object({state: z.string().default("queued"), tags: z.array(z.string()).default(["a"]), note: z.string().nullable().default(null)});
`,
  );
});

Deno.test("defaults - a default inside a model deferred as a whole renders too", () => {
  const artifacts = generate({ applyDefaults: true });

  assertEquals(
    artifacts["src/types/setting.generated.ts"].includes("z.object({enabled: z.boolean().default(true)})"),
    true,
  );
});

// The output before `applyDefaults` existed: each default is left out and
// each optional key is `.optional()`.
const today = `import {z} from 'zod'

export const repo = z.object({name: z.string(), archived: z.boolean().optional(), visibility: z.string().optional(), per_page: z.number().int().optional()});
`;

Deno.test("defaults - without applyDefaults the output is as it was", () => {
  const absent = generate();
  const empty = generate({});
  const off = generate({ applyDefaults: false });

  assertEquals(absent[repo], today);
  assertEquals(empty, absent);
  assertEquals(off, absent);
});

Deno.test("defaults - the generator scope takes applyDefaults, and is optional", () => {
  const subject = undefined;
  const stack = undefined;

  assertEquals(v.parse(enrichmentSchema, { subject, stack }).generator, undefined);
  assertEquals(v.parse(enrichmentSchema, { subject, stack, generator: {} }).generator, {});
  assertEquals(
    v.parse(enrichmentSchema, { subject, stack, generator: { applyDefaults: true } }).generator,
    { applyDefaults: true },
  );
  assertThrows(() => v.parse(enrichmentSchema, { subject, stack, generator: { applyDefaults: "yes" } }));
});
