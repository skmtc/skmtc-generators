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
import {
  additionalPropertiesCases,
  additionalPropertiesDocument,
  checkGenerated,
  cycleDocument,
  runE2eFixture,
  unionDocument,
} from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

/** The zod the output is checked against: getters need zod 4. */
const ZOD = "npm:zod@4.6.7";

/**
 * Checks that each named property infers as exactly its own type, and
 * parses every case of `additionalPropertiesCases`. Loading it throws on
 * the first case zod gets wrong.
 *
 * The trap: an assignment such as `const id: string = value.id` also
 * compiles when `id` is `never` or `any`, so `Equals` compares the types
 * both ways.
 */
const additionalPropertiesConsumer = `import type { z } from "zod";
import { upload } from "@/types/upload.generated.ts";
import { limits } from "@/types/limits.generated.ts";
import { dotted } from "@/types/dotted.generated.ts";
import { tree } from "@/types/tree.generated.ts";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

export const uploadAppId: Equals<z.infer<typeof upload>["app_id"], string> = true;
export const uploadImages: Equals<z.infer<typeof upload>["images"], string[]> = true;
export const limitsId: Equals<z.infer<typeof limits>["id"], string> = true;
export const limitsNote: Equals<z.infer<typeof limits>["note"], string | undefined> = true;
export const dottedKey: Equals<z.infer<typeof dotted>["a.b"], string> = true;
export const treeLabel: Equals<z.infer<typeof tree>["label"], string> = true;

const accepts: Record<string, (value: unknown) => boolean> = {
  Upload: (value) => upload.safeParse(value).success,
  Limits: (value) => limits.safeParse(value).success,
  Dotted: (value) => dotted.safeParse(value).success,
  Tree: (value) => tree.safeParse(value).success,
};

for (const check of ${JSON.stringify(additionalPropertiesCases)}) {
  const accepted = accepts[check.model](check.value);
  if (accepted !== check.accept) {
    throw new Error(\`\${check.model}, \${check.name}: accepted is \${accepted}\`);
  }
}
`;

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

// The trap: `.and(z.record(…))` compiles and accepts `additionalProperties:
// true`, but checks a typed record against the named keys too, so zod
// rejects `{id: "x", count: 1}` (#101).
Deno.test({
  name: "typecheck - a record beside properties checks only the other keys",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: additionalPropertiesDocument,
    });

    assertEquals(Object.keys(artifacts).sort(), [
      "src/types/dotted.generated.ts",
      "src/types/limits.generated.ts",
      "src/types/tree.generated.ts",
      "src/types/upload.generated.ts",
    ]);

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, "src/consumer.ts": additionalPropertiesConsumer },
        imports: { zod: ZOD },
      }),
      [],
    );
  },
});
