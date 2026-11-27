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
  awkwardNamesDocument,
  checkGenerated,
  closedValue,
  cycleDocument,
  cycleEdgeDocument,
  emptyEnumDocument,
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  nodeValue,
  patternDocument,
  paymentValue,
  runE2eFixture,
  stringFormatCases,
  stringFormatDocument,
  unionDocument,
} from "@skmtc/test-support";
import { zodEntry } from "../src/mod.ts";

/** The zod the output is checked against: getters need zod 4. */
const ZOD = "npm:zod@4.6.7";

/**
 * The oldest zod 4 that `.catchall` with a getter beside it fails on: zod 4.1
 * to 4.5 read the shape inside `.catchall`, which runs the getter at module
 * load (4.6 does not).
 */
const ZOD_4_1 = "npm:zod@4.1.12";

// The trap: zod 4 reads a discriminated union's options at the first parse,
// not when the file loads, so two options that allow one value (Coin) throw
// "Duplicate discriminator value" only here.
const unionConsumer = `import { coin } from "@/types/coin.generated.ts";
import { box } from "@/types/box.generated.ts";
import { node } from "@/types/node.generated.ts";

const accepted: [string, boolean][] = [
  ["Coin", coin.safeParse({ side: "face", tails: true }).success],
  ["Box", box.safeParse({ kind: "crate", label: "x" }).success],
  ["Node", node.safeParse({ kind: "folder", readme: { kind: "file" } }).success],
];

for (const [name, success] of accepted) {
  if (!success) throw new Error(\`\${name} refused a value its document allows\`);
}
`;

// Parses a value through each model of `cycleEdgeDocument`, at a depth that
// reaches the cycle.
const cycleEdgeConsumer = `import { node } from "@/types/node.generated.ts";
import { holder } from "@/types/holder.generated.ts";
import { chain } from "@/types/chain.generated.ts";

const accepted: [string, boolean][] = [
  ["Node", node.safeParse({ name: "a", children: [{ name: "b" }], note: "x" }).success],
  ["Holder", holder.safeParse({ meta: { back: {}, note: "x" } }).success],
  ["Chain", chain.safeParse({ kind: "chain", next: { kind: "chain", next: { kind: "leaf" } } }).success],
];

for (const [name, success] of accepted) {
  if (!success) throw new Error(\`\${name} refused a value its document allows\`);
}
`;

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
    assertEquals(Object.keys(artifacts).length, 24);

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, "src/consumer.ts": unionConsumer },
        imports: { zod: ZOD },
      }),
      [],
    );
  },
});

// The trap: on zod 4.6 a getter beside `.catchall` loads, so only the oldest
// zod 4 that reads the shape there shows the ReferenceError.
Deno.test({
  name: "typecheck - a cycle beside a record or through a discriminated property loads on zod 4.1",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: cycleEdgeDocument,
    });

    assertEquals(Object.keys(artifacts).length, 4);

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, "src/consumer.ts": cycleEdgeConsumer },
        imports: { zod: ZOD_4_1 },
      }),
      [],
    );
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

// The trap: `decapitalize` turns `Default` into `default`, and
// `export const default = …` does not parse; `2FA` starts with a digit.
Deno.test({
  name: "typecheck - schema names that are not valid bindings are repaired",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: awkwardNamesDocument,
    });

    assertEquals(Object.keys(artifacts).sort(), [
      "src/types/_2FA.generated.ts",
      "src/types/account.generated.ts",
      "src/types/defaultValue.generated.ts",
      "src/types/deleteValue.generated.ts",
    ]);

    assertEquals(await checkGenerated({ artifacts, imports: { zod: ZOD } }), []);
  },
});

/** Loading it throws when an empty enum accepts a value of its type, or null. */
const emptyEnumConsumer = `import { emptyString } from "@/types/emptyString.generated.ts";
import { emptyNumber } from "@/types/emptyNumber.generated.ts";
import { emptyInteger } from "@/types/emptyInteger.generated.ts";
import { emptyBoolean } from "@/types/emptyBoolean.generated.ts";

const cases: Array<[string, (value: unknown) => boolean, unknown]> = [
  ["EmptyString", (value) => emptyString.safeParse(value).success, "x"],
  ["EmptyNumber", (value) => emptyNumber.safeParse(value).success, 1],
  ["EmptyInteger", (value) => emptyInteger.safeParse(value).success, 1],
  ["EmptyBoolean", (value) => emptyBoolean.safeParse(value).success, true],
];

for (const [name, accepts, sample] of cases) {
  for (const value of [sample, null]) {
    if (accepts(value)) {
      throw new Error(name + " accepts " + JSON.stringify(value));
    }
  }
}
`;

// The trap: a number or integer enum gave `z.union([])`, which does not
// type-check, and a boolean one gave `z.boolean()`.
Deno.test({
  name: "typecheck - an empty enum compiles and accepts nothing",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: emptyEnumDocument,
    });

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, "src/consumer.ts": emptyEnumConsumer },
        imports: { zod: ZOD },
      }),
      [],
    );
  },
});

// Parses a value through an intersection (Pet), and through a union whose
// members are intersections (Payment). Loading it throws when zod refuses a
// value the document allows, or accepts a Pet without the key of Animal.
const intersectionConsumer = `import { pet } from "@/types/pet.generated.ts";
import { payment } from "@/types/payment.generated.ts";

const results: [string, boolean, boolean][] = [
  ["Pet", pet.safeParse({ kind: "dog", name: "Rex" }).success, true],
  ["Pet without the key of Animal", pet.safeParse({ name: "Rex" }).success, false],
  ["Payment", payment.safeParse(${JSON.stringify(paymentValue)}).success, true],
];

for (const [name, success, expected] of results) {
  if (success !== expected) throw new Error(\`\${name}: accepted is \${success}\`);
}
`;

// The trap: zod reads a discriminated union's options at the first parse,
// so "Invalid discriminated union option" shows only when Payment parses.
Deno.test({
  name: "typecheck - an intersection, and a union of intersections, compile against zod and parse",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: intersectionDocument,
      system: keepAllRefs,
    });

    assertEquals(Object.keys(artifacts).length, 6);

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, "src/consumer.ts": intersectionConsumer },
        imports: { zod: ZOD },
      }),
      [],
    );
  },
});

// Closed has \`additionalProperties: false\` beside its \`allOf\`. The parser
// puts it on the member with \`b\`, and a strict object there would refuse
// the keys of Base.
const intersectionCycleConsumer = `import { node } from "@/types/node.generated.ts";
import { closed } from "@/types/closed.generated.ts";

const accepted: [string, boolean][] = [
  ["Node", node.safeParse(${JSON.stringify(nodeValue)}).success],
  ["Closed", closed.safeParse(${JSON.stringify(closedValue)}).success],
];

for (const [name, success] of accepted) {
  if (!success) throw new Error(\`\${name} refused a value its document allows\`);
}
`;

Deno.test({
  name: "typecheck - an intersection with a ref that closes a cycle compiles against zod, loads first and parses",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: intersectionCycleDocument,
    });

    // A failed run renders no files, and nothing then fails the check.
    assertEquals(Object.keys(artifacts).length, 3);

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, "src/consumer.ts": intersectionCycleConsumer },
        imports: { zod: ZOD },
      }),
      [],
    );
  },
});

/** Loading it throws on the first case of `stringFormatCases` zod gets wrong. */
const stringFormatConsumer = `import type { ZodType } from "zod";
import { dateTime } from "@/types/dateTime.generated.ts";
import { date } from "@/types/date.generated.ts";
import { duration } from "@/types/duration.generated.ts";
import { email } from "@/types/email.generated.ts";
import { uri } from "@/types/uri.generated.ts";
import { uuid } from "@/types/uuid.generated.ts";
import { ipv4 } from "@/types/ipv4.generated.ts";
import { ipv6 } from "@/types/ipv6.generated.ts";
import { uriTemplate } from "@/types/uriTemplate.generated.ts";
import { slug } from "@/types/slug.generated.ts";
import { workEmail } from "@/types/workEmail.generated.ts";

const models: Record<string, ZodType> = {
  DateTime: dateTime,
  Date: date,
  Duration: duration,
  Email: email,
  Uri: uri,
  Uuid: uuid,
  Ipv4: ipv4,
  Ipv6: ipv6,
  UriTemplate: uriTemplate,
  Slug: slug,
  WorkEmail: workEmail,
};

for (const check of ${JSON.stringify(stringFormatCases)}) {
  const accepted = models[check.model].safeParse(check.value).success;
  if (accepted !== check.accept) {
    throw new Error(\`\${check.model}, \${JSON.stringify(check.value)}: accepted is \${accepted}\`);
  }
}
`;

// The trap: a check that came in after zod 4.1 breaks generated code for a
// user on 4.1, so each format compiles and parses on the oldest and the newest.
for (const zod of [ZOD_4_1, ZOD]) {
  Deno.test({
    name: `typecheck - each string format and pattern compiles and parses on ${zod}`,
    ignore: Deno.env.get("TYPECHECK") !== "1",
    fn: async () => {
      const { artifacts } = runE2eFixture({
        id: "@skmtc/gen-zod",
        entry: zodEntry,
        document: stringFormatDocument,
      });

      assertEquals(Object.keys(artifacts).length, 11);

      assertEquals(
        await checkGenerated({
          artifacts: { ...artifacts, "src/consumer.ts": stringFormatConsumer },
          imports: { zod },
        }),
        [],
      );
    },
  });
}

// The trap: a pattern ending in `\` or written for another engine made the
// file fail to parse; a `*/` in the comment that replaces it would end the
// comment early. Every file has to compile and load.
Deno.test({
  name: "typecheck - every pattern renders as a regex or a comment, and compiles",
  ignore: Deno.env.get("TYPECHECK") !== "1",
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: "@skmtc/gen-zod",
      entry: zodEntry,
      document: patternDocument,
    });

    assertEquals(Object.keys(artifacts).length, 6);

    assertEquals(await checkGenerated({ artifacts, imports: { zod: ZOD } }), []);
  },
});
