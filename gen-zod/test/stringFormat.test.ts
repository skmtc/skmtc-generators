/**
 * Pins how the string format and pattern fixtures render. The typecheck task
 * checks that the files compile and parse; this runs in the default task.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { patternDocument, runE2eFixture, stringFormatDocument } from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

const generate = (document: typeof stringFormatDocument) =>
  runE2eFixture({ id: "@skmtc/gen-zod", entry: zodEntry, document }).artifacts;

Deno.test("stringFormat - each model renders its format check, pattern or plain string", () => {
  const artifacts = generate(stringFormatDocument);

  const expected: Array<[string, string]> = [
    ["dateTime", "z.iso.datetime({ offset: true })"],
    ["date", "z.iso.date()"],
    ["duration", "z.iso.duration()"],
    ["email", "z.email()"],
    ["uri", "z.url()"],
    ["uuid", "z.guid()"],
    ["ipv4", "z.ipv4()"],
    ["ipv6", "z.ipv6()"],
    ["uriTemplate", "z.string()"],
    ["slug", "z.string().regex(/^[a-z]+(-[a-z]+)*$/u)"],
    ["workEmail", "z.email().max(20).regex(/@example\\.com$/u)"],
  ];

  assertEquals(Object.keys(artifacts).length, expected.length);

  for (const [name, schema] of expected) {
    assertStringIncludes(artifacts[`src/types/${name}.generated.ts`], `export const ${name} = ${schema}`);
  }
});

Deno.test("stringFormat - a pattern JavaScript rejects is a comment, and the file still renders", () => {
  const artifacts = generate(patternDocument);

  assertStringIncludes(
    artifacts["src/types/code.generated.ts"],
    "pattern '(?i)abc' is not a JavaScript regex, so it is not checked",
  );
  // `*/` in the pattern would end the comment early.
  assertStringIncludes(
    artifacts["src/types/account.generated.ts"],
    "pattern '(?i)x*\\/' is not a JavaScript regex",
  );
  assertStringIncludes(artifacts["src/types/url.generated.ts"], "z.string().regex(/^https:\\/\\//u)");
  assertStringIncludes(artifacts["src/types/letters.generated.ts"], "z.string().regex(/^\\p{L}+$/u)");
});
