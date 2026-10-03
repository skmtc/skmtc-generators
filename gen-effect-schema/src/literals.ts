import { LIB } from './lib.ts'
import type { EffectModifiers } from './modifiers.ts'

type Literal = string | number | boolean

/**
 * An enum as Effect literals: one member is `Schema.Literal(x)`, more
 * are `Schema.Literals([x, y])`. `Schema.Literals` takes no `null`; a
 * null member — an OpenAPI 3.1-style nullable enum — is the leaf's
 * nullable modifier instead (see `withNullMember`), so the `NullOr` is
 * applied once with the rest. Called only from a `toString()` body.
 *
 * Under `coerce` the members arrive as strings — `?radius=50` — so `from`
 * names the leaf's string-decoding base (`Schema.FiniteFromString`, the
 * two-spelling boolean) and the literals are what it narrows to:
 * `"50"` decodes to `50`, `"51"` is refused as not one of the members,
 * and encoding gives the string back. A string enum needs no `from`.
 */
export const toLiterals = (
  enums: readonly (Literal | null)[],
  from?: string,
): string => {
  const members = enums.filter((member): member is Literal => member !== null)

  if (members.length === 0) return `${LIB}.Null`

  const rendered = members.map((member) => JSON.stringify(member))

  const literals = rendered.length === 1
    ? `${LIB}.Literal(${rendered[0]})`
    : `${LIB}.Literals([${rendered.join(', ')}])`

  return from === undefined
    ? literals
    : `${from}.pipe(${LIB}.decodeTo(${literals}, SchemaTransformation.passthrough({ strict: false })))`
}

/** The leaf's modifiers, nullable if the enum lists `null` among its members. */
export const withNullMember = (
  modifiers: EffectModifiers,
  enums: readonly (Literal | null)[] | undefined,
): EffectModifiers =>
  enums?.includes(null) ? { ...modifiers, nullable: true } : modifiers
