import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, GeneratorKey, Modifiers, OasUnion, RefName, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { applyModifiers } from "./applyModifiers.ts";
import { isDeferred } from "./deferred.ts";
import { isTypedAsOption } from "./discriminated.ts";

type ZodUnionArgs = {
  context: GenerateContextType;
  destinationPath: string;
  schema: OasUnion;
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
    modifiers,
    rootRef,
    schema,
  }: ZodUnionArgs) {
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

    // The parsed union says whether its discriminator alone picks the member
    // (`isDiscriminable`). Otherwise, or with a member zod 4 does not type as
    // an option (`isTypedAsOption`), it renders `z.union`, which accepts the same
    // values.
    this.discriminator = schema.isDiscriminable() && this.members.every(isTypedAsOption)
      ? schema.discriminator?.propertyName
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
