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

Deno.test("ZodProjection - recursive model is annotated z.ZodType<…> (detected by isReferencedBack, not by rendering)", () => {
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
  // TS7022/7024 circular-inference cycle — set from `isReferencedBack`,
  // NOT by stringifying the value in the constructor.
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

Deno.test("ZodProjection - every reference in a cycle of two models is lazy; the first model is annotated", () => {
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
    "z.object({name: z.string(), team: z.lazy(() => team.optional())})",
  );
  assertEquals(
    `${team.toValue()}`,
    "z.object({members: z.array(z.lazy(() => employee))})",
  );
  // Only the model the cycle came back to is referred back to.
  assertEquals(employee.toIdentifier().typeName, "z.ZodType<Employee>");
  assertEquals(team.toIdentifier().typeName, undefined);
});
