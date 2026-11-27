import { toModelGeneratorKey, toModelRef } from '@skmtc/core'
import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, OasRef, OasSchema, RefParts } from '@skmtc/core'
import { applyModifiers, type ZodModifiers } from "./applyModifiers.ts";
import { ZodProjection } from "./ZodProjection.ts";
import { zodEntry } from "./mod.ts";
type ConstructorProps = {
  context: GenerateContextType;
  destinationPath: string;
  modifiers: ZodModifiers;
  ref: RefParts;
  rootRef?: RefParts;
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<"schema">;
};

export class ZodRef extends TsSnippet {
  type = "ref" as const;
  modifiers: ZodModifiers;
  name: string;
  /** A reference inside a cycle, which a getter or `z.lazy` above defers (see `isDeferred`). */
  deferred: boolean;
  /** A reference inside a cycle, under a name only a reference has (see `isTypedAsOption`). */
  inCycle: boolean;
  /**
   * Whether the model renders `z.lazy(...)` as a whole (`ZodProjection.lazy`).
   * Not known for a reference back, whose model is still being built.
   */
  lazyModel: boolean;
  constructor(
    { context, ref, destinationPath, modifiers, rootRef, schema }:
      ConstructorProps,
  ) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: zodEntry.id,
        ref,
        variant: "main",
      }),
      stackTrail: schema?.stackTrail.clone(),
    });

    // A reference back to a model whose projection is being constructed
    // comes back `suspended`; any other reference inside a cycle comes back
    // `inCycle`. Both are deferred, because any model of a cycle can be the
    // first one loaded. `toModelRef` constructs or reuses every other model,
    // and stitches the import, the reference back's included.
    const modelRef = toModelRef({
      context,
      ref,
      destinationPath,
      rootRef,
      projection: ZodProjection,
      variant: "main",
    });

    this.name = modelRef.settings.identifier.name;
    this.modifiers = modifiers;
    this.inCycle = modelRef.suspended || modelRef.inCycle;
    this.deferred = this.inCycle;
    this.lazyModel = !modelRef.suspended && modelRef.definition.value.lazy;
  }

  override toString(): string {
    return applyModifiers(this.name, this.modifiers, this.deferred);
  }
}
