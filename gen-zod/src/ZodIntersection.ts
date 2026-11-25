import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, GeneratorKey, Modifiers, OasIntersection, RefParts, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { ZodRef } from "./ZodRef.ts";
import { applyModifiers } from "./applyModifiers.ts";
import { isDeferred, needsAnnotation } from "./deferred.ts";
import { assertNoMemberLoop } from "./memberLoop.ts";

type ZodIntersectionArgs = {
  context: GenerateContextType;
  destinationPath: string;
  schema: OasIntersection;
  modifiers: Modifiers;
  generatorKey: GeneratorKey;
  rootRef?: RefParts;
};

/** `animal.and(z.object({name: z.string().optional()}))` */
export class ZodIntersection extends TsSnippet {
  type = "intersection" as const;
  members: TypeSystemValue[];
  modifiers: Modifiers;
  /** See `isDeferred`. A member reference inside a cycle defers itself, as `z.lazy`. */
  deferred: boolean;
  /** See `needsAnnotation`. */
  annotated: boolean;

  constructor(
    { context, generatorKey, destinationPath, modifiers, rootRef, schema }:
      ZodIntersectionArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() });

    assertNoMemberLoop(schema);

    this.members = schema.members.map((member) =>
      toZodValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef,
      })
    );
    this.modifiers = modifiers;
    this.deferred = this.members.some((member) =>
      isDeferred(member) && !(member instanceof ZodRef)
    );
    this.annotated = this.members.some((member) =>
      isDeferred(member) || needsAnnotation(member)
    );

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const [first, ...rest] = this.members.map((member) =>
      member instanceof ZodRef && member.deferred
        ? `z.lazy(() => ${member})`
        : `${member}`
    );

    return applyModifiers(
      `${first}${rest.map((member) => `.and(${member})`).join("")}`,
      this.modifiers,
    );
  }
}
