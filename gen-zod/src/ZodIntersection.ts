import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, GeneratorKey, OasIntersection, RefParts, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { applyModifiers, type ZodModifiers } from "./applyModifiers.ts";
import { isDeferred } from "./deferred.ts";

type ZodIntersectionArgs = {
  context: GenerateContextType;
  destinationPath: string;
  schema: OasIntersection;
  modifiers: ZodModifiers;
  generatorKey: GeneratorKey;
  rootRef?: RefParts;
};

export class ZodIntersection extends TsSnippet {
  type = "intersection" as const;
  members: TypeSystemValue[];
  modifiers: ZodModifiers;
  /** See `isDeferred`. */
  deferred: boolean;

  constructor({
    context,
    generatorKey,
    destinationPath,
    modifiers,
    rootRef,
    schema,
  }: ZodIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() });

    this.members = schema.members.map((member) => {
      return toZodValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef,
      });
    });

    this.modifiers = modifiers;
    this.deferred = this.members.some(isDeferred);

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const members = this.members
      .map((member) => `${member}`)
      .reduce((left, right) => `${left}.and(${right})`);

    return applyModifiers(members, this.modifiers);
  }
}
