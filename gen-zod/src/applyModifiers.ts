import { withOptional } from "./withOptional.ts";
import { withNullable } from "./withNullable.ts";
import type { Modifiers } from '@skmtc/core'

/**
 * The engine's modifiers plus the schema's `default`, which the router
 * lifts off the schema node only when `applyDefaults` is on (see `Zod.ts`).
 */
export type ZodModifiers = Modifiers & { defaultValue?: unknown };

/**
 * Nullable first, then optional or default: `.nullable().default(null)`.
 * A default stands in for `.optional()`: the input may omit the key, and
 * the parsed value always has it. A required key with a default keeps the
 * default too.
 *
 * An object or array default is `.prefault(value)`: zod parses it through
 * the schema, so `{}` fills the defaults inside it, and it type-checks as an
 * input. `.default({})` takes a whole output value and does not compile
 * when a key inside has a default.
 *
 * The trap: `.default()` and `.prefault()` take a value typed from the
 * schema itself. When that type runs through a getter of the cycle, at the
 * value or anywhere below it, TypeScript cannot type the getter (TS7023,
 * TS7022). A `cyclic` value (see `isCyclic`) keeps `.optional()` and leaves
 * its default out.
 */
export const applyModifiers = (content: string, modifiers: ZodModifiers, cyclic = false) => {
  const postNullable = withNullable(content, modifiers);
  const { defaultValue } = modifiers;

  if (defaultValue !== undefined && !cyclic) {
    const method = typeof defaultValue === "object" && defaultValue !== null ? "prefault" : "default";

    return `${postNullable}.${method}(${JSON.stringify(defaultValue)})`;
  }

  const postOptional = withOptional(postNullable, modifiers);

  return postOptional.toString();
};
