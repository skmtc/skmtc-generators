import type { SchemaType } from '@skmtc/core'
import { match } from 'ts-pattern'

/**
 * Whether `openEnums` opens this enum: two or more members besides `null`.
 * A one-member enum is a constant, often a union's tag, and stays closed.
 */
export const opensEnum = (
  enums: readonly (string | null)[] | undefined,
): boolean => (enums ?? []).filter((member) => member !== null).length > 1

/**
 * Whether `openEnums` opens a string enum anywhere in a schema, refs
 * followed. Under it, the type gen-typescript writes for a recursive model
 * is narrower than the schema's, so the `Schema.suspend` annotation on a
 * back-reference does not hold (EffectRef). A cycle reads as "no": the
 * nodes on the way in have answered.
 */
export const hasOpenEnum = (
  schema: SchemaType,
  seen: Set<string> = new Set(),
): boolean => {
  return match(schema)
    .with({ type: 'ref' }, (ref) => {
      if (seen.has(ref.$ref)) return false

      seen.add(ref.$ref)

      return hasOpenEnum(ref.resolveOnce(), seen)
    })
    .with({ type: 'string' }, (string) => opensEnum(string.enums))
    .with({ type: 'array' }, (array) => hasOpenEnum(array.items, seen))
    .with({ type: 'object' }, (object) => {
      const properties = Object.values(object.properties ?? {})
      const additional = object.additionalProperties

      return (
        properties.some((property) => hasOpenEnum(property, seen)) ||
        (typeof additional === 'object' && hasOpenEnum(additional, seen))
      )
    })
    .with(
      { type: 'union' },
      (union) => union.members.some((member) => hasOpenEnum(member, seen)),
    )
    .with({ type: 'number' }, () => false)
    .with({ type: 'integer' }, () => false)
    .with({ type: 'boolean' }, () => false)
    .with({ type: 'unknown' }, () => false)
    .with({ type: 'void' }, () => false)
    .with({ type: 'custom' }, () => false)
    .exhaustive()
}
