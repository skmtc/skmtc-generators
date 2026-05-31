import { SnippetBase } from "@skmtc/core";
import { applyModifiers } from "./applyModifiers.ts";
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasString,
} from "@skmtc/core";
import { List } from "@skmtc/core";
import { ZodConstraint } from "./ZodConstraints.ts";

type ZodStringArgs = {
  context: GenerateContextType;
  stringSchema: OasString;
  modifiers: Modifiers;
  destinationPath: string;
  generatorKey: GeneratorKey;
};

export class ZodString extends SnippetBase {
  type = "string" as const;
  format: string | undefined;
  enums: string[] | (string | null)[] | undefined;
  constraints: List<ZodConstraint[]>;
  modifiers: Modifiers;
  constructor(
    { context, stringSchema, generatorKey, destinationPath, modifiers }:
      ZodStringArgs,
  ) {
    super({ context, generatorKey, schema: stringSchema });

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

    context.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const { enums } = this;

    let content: string;
    if (enums && Array.isArray(enums)) {
      content = enums.length === 1
        ? `z.literal("${enums[0]}")`
        : `z.enum([${enums.map((str) => `"${str}"`).join(", ")}])`;
    } else {
      content = `z.string()`;
    }

    return applyModifiers(`${content}${this.constraints}`, this.modifiers);
  }
}
