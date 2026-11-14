/**
 * The ground-truth gate for cycles: emit every recursive shape, compile it
 * against zod, and load each file first. A pinned string is just as happy
 * to pin output that cannot type-check or that throws when its module
 * loads.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which
 * the default test task does not grant.
 */
import { assertEquals } from "@std/assert";
import { checkGenerated, cycleDocument, runE2eFixture, unionDocument } from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

/** The zod the output is checked against: getters need zod 4. */
const ZOD = "npm:zod@4.6.7";

Deno.test({
  name: "typecheck - every model of a cycle compiles against zod and loads first",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: cycleDocument,
    });

    // A failed run renders no files, and nothing then fails the check.
    assertEquals(Object.keys(artifacts).length, 11);

    assertEquals(await checkGenerated({ artifacts, imports: { zod: ZOD } }), []);
  },
});

Deno.test({
  name: "typecheck - every discriminated union compiles against zod and loads first",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: unionDocument,
    });

    // Each model has a schema, and the models of a z.lazy cycle a
    // gen-typescript type each, in the same file.
    assertEquals(Object.keys(artifacts).length, 15);

    assertEquals(await checkGenerated({ artifacts, imports: { zod: ZOD } }), []);
  },
});
