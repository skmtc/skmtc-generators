import { toModelGeneratorKey, toModelRef } from '@skmtc/core'
import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, Modifiers, OasRef, OasSchema, RefName } from '@skmtc/core'
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

export class ZodRef extends TsSnippet {
  type = "ref" as const;
  modifiers: Modifiers;
  name: string;
  /** A reference inside a cycle, which a getter or `z.lazy` above defers (see `isDeferred`). */
  deferred: boolean;
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
      stackTrail: schema?.stackTrail.clone(),
    });

    // A reference back to a model whose projection is being constructed
    // comes back `suspended`; any other reference inside a cycle comes back
    // `inCycle`. Both are deferred, because any model of a cycle can be the
    // first one loaded. `toModelRef` constructs or reuses every other model,
    // and stitches the import, the reference back's included.
    const ref = toModelRef({
      context,
      refName,
      destinationPath,
      rootRef,
      projection: ZodProjection,
      variant: "main",
    });

    this.name = ref.settings.identifier.name;
    this.modifiers = modifiers;
    this.deferred = ref.suspended || ref.inCycle;
  }

  override toString(): string {
    return applyModifiers(this.name, this.modifiers);
  }
}
