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
 */
export const applyModifiers = (content: string, modifiers: ZodModifiers) => {
  const postNullable = withNullable(content, modifiers);

  if (modifiers.defaultValue !== undefined) {
    return `${postNullable}.default(${JSON.stringify(modifiers.defaultValue)})`;
  }

  const postOptional = withOptional(postNullable, modifiers);

  return postOptional.toString();
};
