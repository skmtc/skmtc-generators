import { TypescriptSnippet } from "@skmtc/lang-typescript";
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasDiscriminator,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue,
} from "@skmtc/core";
import { toZodValue } from "./Zod.ts";
import { applyModifiers } from "./applyModifiers.ts";

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

export class ZodUnion extends TypescriptSnippet {
  type = "union" as const;
  members: TypeSystemValue[];
  discriminator: string | undefined;
  modifiers: Modifiers;

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
    super({ context, generatorKey, schema });

    this.members = members.map((member) => {
      return toZodValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef,
      });
    });

    this.discriminator = discriminator?.propertyName;
    this.modifiers = modifiers;

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
