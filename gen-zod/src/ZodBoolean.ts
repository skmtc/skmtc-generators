import { applyModifiers } from "./applyModifiers.ts";
import {
  type GenerateContextType,
  type GeneratorKey,
  type Modifiers,
  type OasBoolean,
} from "@skmtc/core";
import { TypescriptSnippet } from "@skmtc/lang-typescript";

type ZodBooleanArgs = {
  context: GenerateContextType;
  modifiers: Modifiers;
  /**
   * The parsed boolean schema. Carries `enums` (the boolean values
   * the schema constrains to) so a single-value enum can be emitted
   * as `z.literal(true)` / `z.literal(false)` rather than a wider
   * `z.boolean()`. Without this, discriminated unions on literal
   * booleans lose their narrowing at the consumer's type level —
   * friction #17 in the FieldPlan dogfood log.
   */
  schema: OasBoolean;
  destinationPath: string;
  generatorKey: GeneratorKey;
};

export class ZodBoolean extends TypescriptSnippet {
  type = "boolean" as const;
  modifiers: Modifiers;
  enums?: boolean[] | (boolean | null)[];

  constructor(
    { context, modifiers, schema, destinationPath, generatorKey }:
      ZodBooleanArgs,
  ) {
    super({ context, generatorKey, schema });

    this.modifiers = modifiers;
    this.enums = schema.enums;

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const { enums } = this;

    if (enums && Array.isArray(enums)) {
      // Matches the same `length === 1` → `z.literal(...)` shape used
      // by `ZodNumber`, `ZodInteger`, and `ZodString`. Multi-value
      // enums on a boolean (`enum: [true, false]`) carry no extra
      // information vs an unconstrained boolean — fall through to
      // `z.boolean()`.
      const content = enums.length === 1
        ? `z.literal(${enums[0]})`
        : `z.boolean()`;
      return applyModifiers(content, this.modifiers);
    }

    return applyModifiers(`z.boolean()`, this.modifiers);
  }
}
