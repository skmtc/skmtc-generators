import { SnippetBase, ModelDriver, toModelGeneratorKey } from "@skmtc/core";
import type {
  GenerateContextType,
  Modifiers,
  OasRef,
  OasSchema,
  RefName,
} from "@skmtc/core";
import { applyModifiers } from "./applyModifiers.ts";
import { ZodProjection } from "./ZodProjection.ts";
import { zodEntry } from "./mod.ts";
type ConstructorProps = {
  context: GenerateContextType;
  destinationPath: string;
  modifiers: Modifiers;
  refName: RefName;
  rootRef?: RefName;
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<"schema">;
};

export class ZodRef extends SnippetBase {
  type = "ref" as const;
  modifiers: Modifiers;
  name: string;
  terminal: boolean;
  constructor(
    { context, refName, destinationPath, modifiers, rootRef, schema }:
      ConstructorProps,
  ) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: zodEntry.id,
        refName,
        variant: "main",
      }),
      schema,
    });

    if (context.modelDepth[`${zodEntry.id}:${refName}`] > 0) {
      const settings = context.toModelContentSettings({
        refName,
        projection: ZodProjection,
        variant: "main",
      });

      context.register({
        imports: { zod: ["z"] },
        destinationPath: settings.exportPath,
      });

      this.name = settings.identifier.name;
      this.modifiers = modifiers;
      this.terminal = true;
    } else {
      const { settings } = new ModelDriver({
        context,
        refName,
        destinationPath,
        rootRef,
        projection: ZodProjection,
        variant: "main",
      });

      this.name = settings.identifier.name;
      this.modifiers = modifiers;
      this.terminal = false;
    }
  }

  override toString(): string {
    const out = applyModifiers(this.name, this.modifiers);
    return this.terminal ? `z.lazy(() => ${out})` : out;
  }
}
