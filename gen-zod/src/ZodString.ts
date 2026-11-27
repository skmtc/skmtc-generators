import { List, toRegExpLiteral, toStringLiteral, TsSnippet, withDescription } from '@skmtc/lang-typescript'
import { applyModifiers } from "./applyModifiers.ts";
import type { GenerateContextType, GeneratorKey, Modifiers, OasString } from '@skmtc/core'
import { ZodConstraint } from "./ZodConstraints.ts";
import { formatSchemas } from "./formats.ts";

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
  /** `z.string()`, or the Zod 4 schema that checks the format (`formats.ts`). */
  base: string;
  constraints: List<ZodConstraint[]>;
  /** A `pattern` JavaScript rejects, left unchecked and named in a comment. */
  skippedPattern: string | undefined;
  modifiers: Modifiers;
  constructor(
    { context, stringSchema, generatorKey, destinationPath, modifiers }:
      ZodStringArgs,
  ) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() });

    this.enums = stringSchema.enums;
    this.format = stringSchema.format;
    // A format Zod 4 has no check for stays a plain string.
    this.base = (this.format === undefined ? undefined : formatSchemas.get(this.format)) ?? "z.string()";
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

    if (stringSchema.maxLength !== undefined) {
      this.constraints.values.push(
        new ZodConstraint({
          context,
          name: "max",
          value: stringSchema.maxLength,
        }),
      );
    }

    if (stringSchema.pattern) {
      const literal = toPatternLiteral(stringSchema.pattern);

      if (literal === undefined) {
        this.skippedPattern = stringSchema.pattern;

        // A warning sets this model's result to 'warning', so the CLI and
        // the manifest show it, not only the comment in the output.
        context.logger.warn(toSkippedPatternNote(stringSchema.pattern));
      } else {
        this.constraints.values.push(
          new ZodConstraint({ context, name: "regex", value: literal }),
        );
      }
    }

    this.modifiers = modifiers;

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const { enums } = this;

    // An enum lists every value it accepts, so the format, length and
    // pattern checks add nothing, and `z.enum` / `z.literal` have no
    // `.max()` to call. ZodNumber and ZodInteger drop theirs the same way.
    if (enums && Array.isArray(enums)) {
      // Core lists `null` only on a nullable schema, and the nullable
      // modifier adds `.nullable()`, so the enum lists the strings. An
      // empty `enum: []` accepts nothing.
      const members: Array<string | null> = enums;
      const values = members.filter((value): value is string => value !== null);

      if (values.length === 0) {
        return applyModifiers(members.includes(null) ? "z.null()" : "z.never()", this.modifiers);
      }

      if (values.length === 1) {
        return applyModifiers(`z.literal(${toStringLiteral(values[0])})`, this.modifiers);
      }

      return applyModifiers(`z.enum([${values.map(toStringLiteral).join(", ")}])`, this.modifiers);
    }

    const content = applyModifiers(`${this.base}${this.constraints}`, this.modifiers);

    // The trap: a pattern written for another engine (`(?i)`) makes the
    // whole file fail to parse, and throwing fails the whole run. So the
    // check is left out, and the comment says which pattern and why.
    return this.skippedPattern === undefined ? content : withDescription(content, {
      description: toSkippedPatternNote(this.skippedPattern),
    });
  }
}

// Copied from gen-effect-schema's EffectString.ts (#130): no package both
// generators import holds it yet.

/** Says which pattern was left out and why, in the output and the warning. */
const toSkippedPatternNote = (pattern: string): string =>
  `pattern ${toStringLiteral(pattern)} is not a JavaScript regex, so it is not checked`;

/**
 * The pattern as a regex literal, or `undefined` when JavaScript rejects it.
 *
 * The trap: without the `u` flag, `^\p{L}+$` is valid and matches the text
 * `p{L}`, not a letter. JSON Schema patterns mean Unicode, so `u` comes
 * first. A pattern valid only without it (`\-` outside a class) falls back to
 * no flag.
 */
const toPatternLiteral = (pattern: string): string | undefined =>
  tryRegExpLiteral(pattern, "u") ?? tryRegExpLiteral(pattern, "");

/**
 * `toRegExpLiteral` lets the engine escape the literal, and throws a
 * `SyntaxError` on a pattern or flags it rejects.
 */
const tryRegExpLiteral = (pattern: string, flags: string): string | undefined => {
  try {
    return toRegExpLiteral(pattern, flags);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }

    throw error;
  }
};
