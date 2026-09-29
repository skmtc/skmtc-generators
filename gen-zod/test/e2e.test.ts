/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { modelDocument, runE2eFixture } from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

const { artifacts } = runE2eFixture({
  id: "@skmtc/gen-zod",
  entry: zodEntry,
  document: modelDocument,
});

Deno.test("e2e - artifact keys are forward-slash paths under basePath", () => {
  assertEquals(Object.keys(artifacts).sort(), [
    "src/types/status.generated.ts",
    "src/types/user.generated.ts",
  ]);
});

Deno.test("e2e - generated imports name workspace paths with forward slashes", () => {
  assertStringIncludes(
    artifacts["src/types/user.generated.ts"],
    `import {status} from '@/types/status.generated.ts'\n`,
  );
});

Deno.test("e2e - exportPath puts every schema in one file", () => {
  const { artifacts } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: modelDocument,
    enrichments: { _generator: { exportPath: "@/models.ts" } },
  });

  assertEquals(Object.keys(artifacts), ["src/models.generated.ts"]);
});

Deno.test("e2e - a schema name that starts with a digit gets a schema prefix", () => {
  const { artifacts } = runE2eFixture({
    id: "@skmtc/gen-zod",
    entry: zodEntry,
    document: { ...modelDocument, components: { schemas: { "429": { type: "string" } } } },
  });

  assertStringIncludes(artifacts["src/types/schema429.generated.ts"], "export const schema429 = ");
});
