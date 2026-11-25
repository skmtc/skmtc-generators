import { OasUnion } from '@skmtc/core'
import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, GeneratorKey, Modifiers, OasIntersection, OasRef, OasSchema, RefParts, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { ZodRef } from "./ZodRef.ts";
import { ZodUnion } from "./ZodUnion.ts";
import { applyModifiers } from "./applyModifiers.ts";
import { isDeferred, needsAnnotation } from "./deferred.ts";
import { buildMembers, hasNoKeys } from "./intersectionMembers.ts";

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

    const toValue = (member: OasSchema | OasRef<"schema">): TypeSystemValue =>
      hasNoKeys(member)
        ? new ZodAnyKeys({ context, generatorKey, stackTrail: member.stackTrail.clone() })
        : toZodValue({
          destinationPath,
          schema: member,
          required: true,
          context,
          rootRef,
        });

    this.members = buildMembers(schema, (member) => {
      // `anyOf: [{ minProperties: 1 }, …]`: an empty branch is built here, as
      // the union would write it as `z.object({})`.
      if (member instanceof OasUnion && member.members.some(hasNoKeys)) {
        const union = new ZodUnion({
          context,
          generatorKey,
          destinationPath,
          modifiers: { required: true, nullable: member.nullable },
          rootRef,
          schema: new OasUnion({ members: [] }),
        });
        union.members = member.members.map(toValue);
        union.deferred = union.members.some(isDeferred);
        union.annotated = union.members.some(needsAnnotation);

        return union;
      }

      return toValue(member);
    });
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

/**
 * A member, or a branch of one that is a union, that is an object with no keys
 * of its own (see `hasNoKeys`). zod infers `Record<string, never>` for
 * `z.object({})`, which would refuse the keys of the other members.
 */
class ZodAnyKeys extends TsSnippet {
  type = "unknown" as const;

  override toString(): string {
    return "z.looseObject({})";
  }
}
