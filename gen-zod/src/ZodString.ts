import { List, toStringLiteral, TsSnippet } from '@skmtc/lang-typescript'
import { match } from 'ts-pattern'
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
  /** Renders `z.literal` or `z.enum` (see `isLiteral`). */
  literal: boolean;
  constructor(
    { context, stringSchema, generatorKey, destinationPath, modifiers }:
      ZodStringArgs,
  ) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() });

    this.enums = stringSchema.enums;
    this.literal = Array.isArray(this.enums) && this.enums.length > 0;
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
      // Core lists `null` only on a nullable schema, and the nullable
      // modifier adds `.nullable()`, so the enum lists the strings.
      const members: Array<string | null> = enums;
      const values = members.filter((value): value is string => value !== null);

      const content = match(values.length)
        .with(0, () => "z.null()")
        .with(1, () => `z.literal(${toStringLiteral(values[0])})`)
        .otherwise(() => `z.enum([${values.map(toStringLiteral).join(", ")}])`);

      return applyModifiers(content, this.modifiers);
    }

    return applyModifiers(`z.string()${this.constraints}`, this.modifiers);
  }
}
