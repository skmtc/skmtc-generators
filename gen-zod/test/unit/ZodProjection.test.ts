import { assert, assertEquals } from "@std/assert";
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

Deno.test("ZodProjection - a model that refers to itself reads the reference in a getter, unannotated", () => {
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

  // zod 4 reads a getter when it parses and infers the type through it, so
  // the export needs no annotation and keeps its full object type.
  assertEquals(
    `${inserted.toValue()}`,
    "z.object({value: z.string(), get children() { return z.array(treeNode).optional() }})",
  );
  assertEquals(inserted.toIdentifier().typeName, undefined);
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

Deno.test("ZodProjection - every property holding a reference in a cycle of two models is a getter", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    Employee: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
        team: { $ref: "#/components/schemas/Team" },
      },
      required: ["name"],
    },
    Team: {
      type: "object" as const,
      properties: {
        members: {
          type: "array" as const,
          items: { $ref: "#/components/schemas/Employee" },
        },
      },
      required: ["members"],
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const employee = context.insertModel(ZodProjection, "Employee" as RefName);
  const team = context.insertModel(ZodProjection, "Team" as RefName);

  // The trap: a plain `team` in employee's file reads Team before its module
  // has run when team's file loads first. Any model of a cycle can be first.
  assertEquals(
    `${employee.toValue()}`,
    "z.object({name: z.string(), get team() { return team.optional() }})",
  );
  assertEquals(
    `${team.toValue()}`,
    "z.object({get members() { return z.array(employee) }})",
  );
  assertEquals(employee.toIdentifier().typeName, undefined);
  assertEquals(team.toIdentifier().typeName, undefined);
});

Deno.test("ZodProjection - a union that refers to itself with no property on the way is lazy, typed by gen-typescript", () => {
  const stackTrail = new StackTrail(["TEST"]);
  const schemas = {
    JsonValue: {
      oneOf: [
        { type: "string" as const },
        {
          type: "array" as const,
          items: { $ref: "#/components/schemas/JsonValue" },
        },
      ],
    },
  };

  const parseContext = toParseContext({ schemas });
  const oasDocument = parseContext.parse(stackTrail);
  const context = toGenerateContext({ oasDocument });

  const inserted = context.insertModel(ZodProjection, "JsonValue" as RefName);

  // A getter needs an object property; a union has none, so the whole model
  // is deferred, and TypeScript needs the type spelled out to infer it.
  assertEquals(
    `${inserted.toValue()}`,
    "z.lazy(() => z.union([z.string(), z.array(jsonValue)]))",
  );
  assertEquals(inserted.toIdentifier().typeName, "z.ZodType<JsonValue>");
  // The type is gen-typescript's, in the file gen-zod and gen-typescript share.
  assert(
    context.findDefinition({
      name: "JsonValue",
      exportPath: "@/types/jsonValue.generated.ts",
    }),
    "gen-typescript's JsonValue type should be beside the schema",
  );
});
