import { ZodString } from "./ZodString.ts";
import { ZodArray } from "./ZodArray.ts";
import { ZodRef } from "./ZodRef.ts";
import { ZodObject } from "./ZodObject.ts";
import { ZodUnion } from "./ZodUnion.ts";
import type { Modifiers, SchemaToValueFn } from "@skmtc/core";
import { ZodNumber } from "./ZodNumber.ts";
import { ZodInteger } from "./ZodInteger.ts";
import { ZodBoolean } from "./ZodBoolean.ts";
import { ZodVoid } from "./ZodVoid.ts";
import { ZodUnknown } from "./ZodUnknown.ts";
import { toGeneratorOnlyKey, toRefName } from "@skmtc/core";
import { zodEntry } from "./mod.ts";
import type { TypeSystemCustom } from "@skmtc/core";

/**
 * Maps a parsed schema node to its Zod snippet. Fine-grained attribution
 * is captured via each snippet's super call, which snapshots the schema's
 * `stackTrail` (`stackTrail: schema.stackTrail.clone()`) — no
 * router-level wrapper. The originating node is passed to every snippet,
 * including the ones that otherwise receive only decomposed parts
 * (`items` / `members` / `refName`) or nothing (`void` / `unknown`).
 */
export const toZodValue: SchemaToValueFn = ({
  schema,
  destinationPath,
  required,
  context,
  rootRef,
}) => {
  const modifiers: Modifiers = {
    required,
    // description: 'description' in schema ? schema.description : undefined,
    nullable: "nullable" in schema ? schema.nullable : undefined,
  };

  const generatorKey = toGeneratorOnlyKey({ generatorId: zodEntry.id });

  switch (schema.type) {
    case "custom":
      return schema as TypeSystemCustom;
    case "ref":
      return new ZodRef({
        context,
        destinationPath,
        refName: toRefName(schema.$ref),
        modifiers,
        rootRef,
        schema,
      });
    case "array":
      return new ZodArray({
        context,
        destinationPath,
        modifiers,
        items: schema.items,
        generatorKey,
        rootRef,
        schema,
      });
    case "object":
      return new ZodObject({
        context,
        destinationPath,
        objectSchema: schema,
        modifiers,
        generatorKey,
        rootRef,
      });
    case "union":
      return new ZodUnion({
        context,
        destinationPath,
        members: schema.members,
        discriminator: schema.discriminator,
        modifiers,
        generatorKey,
        rootRef,
        schema,
      });
    case "number":
      return new ZodNumber({
        context,
        modifiers,
        schema,
        destinationPath,
        generatorKey,
      });
    case "integer":
      return new ZodInteger({
        context,
        schema,
        modifiers,
        destinationPath,
        generatorKey,
      });
    case "boolean":
      return new ZodBoolean({
        context,
        modifiers,
        schema,
        destinationPath,
        generatorKey,
      });
    case "void":
      return new ZodVoid({ context, destinationPath, generatorKey });
    case "string":
      return new ZodString({
        context,
        stringSchema: schema,
        modifiers,
        destinationPath,
        generatorKey,
      });
    case "unknown":
      return new ZodUnknown({ context, destinationPath, generatorKey, schema });
    default: {
      // Exhaustiveness check - if SchemaType is properly defined, this should never happen
      const _exhaustive: never = schema;
      throw new Error(`Unhandled schema type: ${_exhaustive}`);
    }
  }
};
