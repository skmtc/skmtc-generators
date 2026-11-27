import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, GeneratorKey, OasRef, OasSchema, RefParts, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { applyModifiers, type ZodModifiers } from "./applyModifiers.ts";
import { isDeferred } from "./deferred.ts";

type ZodArrayArgs = {
  context: GenerateContextType;
  destinationPath: string;
  items: OasSchema | OasRef<"schema">;
  /** The originating array schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<"schema">;
  modifiers: ZodModifiers;
  generatorKey: GeneratorKey;
  rootRef?: RefParts;
};

export class ZodArray extends TsSnippet {
  type = "array" as const;
  items: TypeSystemValue;
  modifiers: ZodModifiers;
  /** See `isDeferred`. */
  deferred: boolean;

  constructor(
    { context, generatorKey, destinationPath, items, modifiers, rootRef, schema }:
      ZodArrayArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() });

    this.modifiers = modifiers;

    this.items = toZodValue({
      destinationPath,
      schema: items,
      required: true,
      context,
      rootRef,
    });

    this.deferred = isDeferred(this.items);

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    return applyModifiers(`z.array(${this.items})`, this.modifiers);
  }
}
