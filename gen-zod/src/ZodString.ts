import { TsSnippet, List } from '@skmtc/lang-typescript'
import { applyModifiers } from "./applyModifiers.ts";
import type { GenerateContextType, GeneratorKey, Modifiers, OasString } from '@skmtc/core'
import { ZodConstraint } from "./ZodConstraints.ts";

type ZodStringArgs = {
  context: GenerateContextType;
  stringSchema: OasString;
  modifiers: Modifiers;
  destinationPath: string;
  generatorKey: GeneratorKey;
};

export class ZodString extends TsSnippet {
  type = "string" as const;
  format: string | undefined;
  enums: string[] | (string | null)[] | undefined;
  constraints: List<ZodConstraint[]>;
  modifiers: Modifiers;
  constructor(
    { context, stringSchema, generatorKey, destinationPath, modifiers }:
      ZodStringArgs,
  ) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() });

    this.enums = stringSchema.enums;
    this.format = stringSchema.format;
    this.constraints = new List<ZodConstraint[]>([], {
      skipEmpty: true,
      separator: "",
    });

    if (stringSchema.minLength) {
      this.constraints.values.push(
        new ZodConstraint({
          context,
          name: "min",
          value: stringSchema.minLength,
        }),
      );
    }

    if (stringSchema.maxLength) {
      this.constraints.values.push(
        new ZodConstraint({
          context,
          name: "max",
          value: stringSchema.maxLength,
        }),
      );
    }

    this.modifiers = modifiers;

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const { enums } = this;

    // An enum lists every value it accepts, so the length and pattern
    // checks add nothing, and `z.enum` / `z.literal` have no `.max()` to
    // call. ZodNumber and ZodInteger drop theirs the same way.
    if (enums && Array.isArray(enums)) {
      const content = enums.length === 1
        ? `z.literal("${enums[0]}")`
        : `z.enum([${enums.map((str) => `"${str}"`).join(", ")}])`;

      return applyModifiers(content, this.modifiers);
    }

    return applyModifiers(`z.string()${this.constraints}`, this.modifiers);
  }
}
