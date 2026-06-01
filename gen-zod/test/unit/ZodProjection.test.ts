import { assert, assertEquals } from "jsr:@std/assert@^1.0.0";
import { ZodProjection } from "../../src/ZodProjection.ts";
import { type RefName, StackTrail } from "@skmtc/core";
import { toGenerateContext } from "../helpers/toGenerateContext.ts";
import { toParseContext } from "../helpers/toParseContext.ts";

Deno.test("ZodProjection - simple object type", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    User: {
      type: "object" as const,
      properties: {
        id: { type: "string" as const },
        name: { type: "string" as const },
      },
      required: ["id", "name"],
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const zodProjection = context.insertModel(ZodProjection, "User" as RefName);

  // Should generate an object with required properties
  assertEquals(
    `${zodProjection.toValue()}`,
    "z.object({id: z.string(), name: z.string()})",
  );
});

Deno.test("ZodProjection - object with optional properties", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    Product: {
      type: "object" as const,
      properties: {
        id: { type: "string" as const },
        name: { type: "string" as const },
        description: { type: "string" as const },
      },
      required: ["id", "name"],
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const zodProjection = context.insertModel(
    ZodProjection,
    "Product" as RefName,
  );

  assertEquals(
    `${zodProjection.toValue()}`,
    "z.object({id: z.string(), name: z.string(), description: z.string().optional()})",
  );
});

Deno.test("ZodProjection - primitive string type", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    UserId: {
      type: "string" as const,
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const zodProjection = context.insertModel(ZodProjection, "UserId" as RefName);

  assertEquals(`${zodProjection.toValue()}`, "z.string()");
});

Deno.test("ZodProjection - array type", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    UserList: {
      type: "array" as const,
      items: {
        type: "string" as const,
      },
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const zodProjection = context.insertModel(
    ZodProjection,
    "UserList" as RefName,
  );

  assertEquals(`${zodProjection.toValue()}`, "z.array(z.string())");
});

Deno.test("ZodProjection - union type", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: "string" as const }, { type: "number" as const }],
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const zodProjection = context.insertModel(
    ZodProjection,
    "StringOrNumber" as RefName,
  );

  assertEquals(
    `${zodProjection.toValue()}`,
    "z.union([z.string(), z.number()])",
  );
});

Deno.test("ZodProjection - recursive model is annotated z.ZodType<…> (detected via modelDepth, not by rendering)", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    TreeNode: {
      type: "object" as const,
      properties: {
        value: { type: "string" as const },
        children: {
          type: "array" as const,
          items: { $ref: "#/components/schemas/TreeNode" },
        },
      },
      required: ["value"],
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const inserted = context.insertModel(ZodProjection, "TreeNode" as RefName);

  // The self-reference renders as a deferred `z.lazy(() => …)`.
  assert(
    `${inserted.toValue()}`.includes("z.lazy("),
    "recursive ref should render z.lazy(...)",
  );
  // …and the export identifier carries the type annotation that breaks the
  // TS7022/7024 circular-inference cycle — set from the `modelDepth > 1`
  // signal, NOT by stringifying the value in the constructor.
  assertEquals(inserted.toIdentifier().typeName, "z.ZodType<TreeNode>");
});

Deno.test("ZodProjection - non-recursive model carries no type annotation", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    User: {
      type: "object" as const,
      properties: {
        id: { type: "string" as const },
        name: { type: "string" as const },
      },
      required: ["id", "name"],
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const inserted = context.insertModel(ZodProjection, "User" as RefName);

  assertEquals(inserted.toIdentifier().typeName, undefined);
});
