import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, GeneratorKey, Modifiers, OasDiscriminator, OasRef, OasSchema, RefName, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { applyModifiers } from "./applyModifiers.ts";
import { isDeferred } from "./deferred.ts";
import { isDiscriminable } from "./discriminated.ts";

type ZodUnionArgs = {
  context: GenerateContextType;
  destinationPath: string;
  members: (OasSchema | OasRef<"schema">)[];
  /** The originating union schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<"schema">;
  discriminator?: OasDiscriminator;
  modifiers: Modifiers;
  generatorKey: GeneratorKey;
  rootRef?: RefName;
};

export class ZodUnion extends TsSnippet {
  type = "union" as const;
  members: TypeSystemValue[];
  /** The key `z.discriminatedUnion` switches on, when every member can be its option. */
  discriminator: string | undefined;
  modifiers: Modifiers;
  /** See `isDeferred`. */
  deferred: boolean;

  constructor({
    context,
    generatorKey,
    destinationPath,
    members,
    discriminator,
    modifiers,
    rootRef,
    schema,
  }: ZodUnionArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() });

    this.members = members.map((member) => {
      return toZodValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef,
      });
    });

    // See `isDiscriminable`. With a member zod 4 does not take as an option,
    // the union renders `z.union`, which accepts the same values.
    const key = discriminator?.propertyName;

    this.discriminator = key !== undefined &&
        this.members.every((member) => isDiscriminable(member, key))
      ? key
      : undefined;
    this.modifiers = modifiers;
    this.deferred = this.members.some(isDeferred);

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const members = this.members.map((member) => `${member}`).join(", ");

    const content = this.discriminator
      ? `z.discriminatedUnion("${this.discriminator}", [${members}])`
      : `z.union([${members}])`;

    return applyModifiers(content, this.modifiers);
  }
}
