import { SnippetBase } from "@skmtc/core";
import { applyModifiers } from "./applyModifiers.ts";
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasInteger,
} from "@skmtc/core";
import { List } from "@skmtc/core";
import { ZodConstraint } from "./ZodConstraints.ts";

type ZodIntegerArgs = {
  context: GenerateContextType;
  schema: OasInteger;
  modifiers: Modifiers;
  destinationPath: string;
  generatorKey: GeneratorKey;
};

export class ZodInteger extends SnippetBase {
  type = "integer" as const;
  modifiers: Modifiers;
  format?: "int32" | "int64";
  enums?: number[] | (number | null)[];
  constraints: List<ZodConstraint[]>;
  constructor(
    { context, schema, modifiers, destinationPath, generatorKey }:
      ZodIntegerArgs,
  ) {
    super({ context, generatorKey, schema });

    this.format = schema.format;
    this.enums = schema.enums;
    this.modifiers = modifiers;

    this.constraints = new List<ZodConstraint[]>([], {
      skipEmpty: true,
      separator: "",
    });

    if (schema.minimum !== undefined) {
      if (schema.exclusiveMinimum) {
        this.constraints.values.push(
          new ZodConstraint({ context, name: "gt", value: schema.minimum }),
        );
      } else {
        this.constraints.values.push(
          new ZodConstraint({ context, name: "gte", value: schema.minimum }),
        );
      }
    }

    if (schema.maximum !== undefined) {
      if (schema.exclusiveMaximum) {
        this.constraints.values.push(
          new ZodConstraint({ context, name: "lt", value: schema.maximum }),
        );
      } else {
        this.constraints.values.push(
          new ZodConstraint({ context, name: "lte", value: schema.maximum }),
        );
      }
    }

    if (schema.multipleOf !== undefined) {
      this.constraints.values.push(
        new ZodConstraint({
          context,
          name: "multipleOf",
          value: schema.multipleOf,
        }),
      );
    }

    context.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const { enums } = this;

    let content: string;

    if (enums && Array.isArray(enums)) {
      content = enums.length === 1
        ? `z.literal(${enums[0]})`
        : `z.union([${enums.map((e) => `z.literal(${e})`).join(", ")}])`;
      return applyModifiers(content, this.modifiers);
    } else {
      content = `z.number().int()`;
      return applyModifiers(`${content}${this.constraints}`, this.modifiers);
    }
  }
}
