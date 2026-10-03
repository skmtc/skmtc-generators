import type { Modifiers, Stringable } from '@skmtc/core'
import { LIB } from './lib.ts'

/**
 * The engine's modifiers plus the schema's `default`, rendered as a
 * decoding default where `.optional()` would go. The engine keeps
 * `default` on the schema node rather than in `Modifiers` (`OasString.default`,
 * `OasArray.defaultValue`, …); the router lifts it here so every leaf
 * applies it the same way.
 */
export type EffectModifiers = Modifiers & { defaultValue?: unknown }

/** What a leaf imports from `effect`: the schema library, and `Effect` when a default is decoded in. */
export const libImports = ({ defaultValue }: EffectModifiers): string[] =>
  defaultValue === undefined ? [LIB] : [LIB, 'Effect']

/**
 * Optional, nullable and default, applied ONCE at each leaf's render.
 * Nullable wraps the value first, optional wraps the result:
 * `Schema.optional(Schema.NullOr(x))`.
 *
 * `Schema.optional` rather than `Schema.optionalKey`: an absent key is
 * what the document means, but an explicit `undefined` also passes,
 * which is how the zod side behaves — a handler that builds a response
 * with a possibly-undefined field decodes the same under either.
 *
 * A default stands in for optional, as zod's `.default(x)` does: the
 * input may omit the field (or send `undefined`), the decoded value never
 * lacks it — `x.pipe(Schema.withDecodingDefaultType(Effect.succeed(d)))`,
 * which on its own makes the key optional on the `Encoded` side and
 * required on the `Type` side (an explicit `Schema.optional` before it
 * would leave the `Type` optional too). The `Type` variant, because the
 * document's default is a value of the schema's type — `500`, not the
 * `"500"` a coerced query parameter carries on the wire. A required field
 * with a default keeps the default, since the zod side accepts an absent
 * input there too.
 */
export const applyModifiers = (
  value: Stringable,
  { required, nullable, defaultValue }: EffectModifiers,
): string => {
  const withNullable = nullable ? `${LIB}.NullOr(${value})` : `${value}`

  if (defaultValue !== undefined) {
    return `${withNullable}.pipe(${LIB}.withDecodingDefaultType(Effect.succeed(${
      JSON.stringify(defaultValue)
    })))`
  }

  return required ? withNullable : `${LIB}.optional(${withNullable})`
}
