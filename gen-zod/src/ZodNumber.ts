import {
  type GenerateContextType,
  type GeneratorKey,
  type Modifiers,
  type OasNumber,
} from "@skmtc/core";
import { TsSnippet } from "@skmtc/lang-typescript";
import { applyModifiers } from "./applyModifiers.ts";
import { List } from "@skmtc/core";
import { ZodConstraint } from "./ZodConstraints.ts";

type ZodNumberArgs = {
  context: GenerateContextType;
  modifiers: Modifiers;
  schema: OasNumber;
  destinationPath: string;
  generatorKey: GeneratorKey;
};

export class ZodNumber extends TsSnippet {
  type = "number" as const;
  modifiers: Modifiers;
  enums?: number[] | (number | null)[];
  constraints: List<ZodConstraint[]>;
  constructor(
    { context, modifiers, schema, destinationPath, generatorKey }:
      ZodNumberArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() });

    this.modifiers = modifiers;
    this.enums = schema.enums;
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

    this.register({ imports: { zod: ["z"] }, destinationPath });
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
      content = `z.number()`;
      return applyModifiers(`${content}${this.constraints}`, this.modifiers);
    }
  }
}
