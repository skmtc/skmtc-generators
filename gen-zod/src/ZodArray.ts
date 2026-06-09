import { SnippetBase } from "@skmtc/core";
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue,
} from "@skmtc/core";
import { toZodValue } from "./Zod.ts";
import { applyModifiers } from "./applyModifiers.ts";

type ZodArrayArgs = {
  context: GenerateContextType;
  destinationPath: string;
  items: OasSchema | OasRef<"schema">;
  /** The originating array schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<"schema">;
  modifiers: Modifiers;
  generatorKey: GeneratorKey;
  rootRef?: RefName;
};

export class ZodArray extends SnippetBase {
  type = "array" as const;
  items: TypeSystemValue;
  modifiers: Modifiers;

  constructor(
    { context, generatorKey, destinationPath, items, modifiers, rootRef, schema }:
      ZodArrayArgs,
  ) {
    super({ context, generatorKey, schema });

    this.modifiers = modifiers;

    this.items = toZodValue({
      destinationPath,
      schema: items,
      required: true,
      context,
      rootRef,
    });

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    return applyModifiers(`z.array(${this.items})`, this.modifiers);
  }
}
