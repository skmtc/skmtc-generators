import type { SchemaType } from '@skmtc/core'
import { match } from 'ts-pattern'

/**
 * Whether a schema decodes differently from a string than from JSON: a
 * number, boolean or array leaf does, an object or union does if anything
 * under it does, a string does not. A cycle reads as "no" — the leaves on
 * the way in have answered. Decides whether a coerced `$ref` needs its
 * target's twin at all (EffectRef).
 */
export const needsCoercion = (
  schema: SchemaType,
  seen: Set<string> = new Set(),
): boolean => {
  return match(schema)
    .with({ type: 'ref' }, (ref) => {
      if (seen.has(ref.$ref)) return false

      seen.add(ref.$ref)

      return needsCoercion(ref.resolveOnce(), seen)
    })
    .with({ type: 'number' }, () => true)
    .with({ type: 'integer' }, () => true)
    .with({ type: 'boolean' }, () => true)
    .with({ type: 'array' }, () => true)
    .with({ type: 'object' }, (object) => {
      const properties = Object.values(object.properties ?? {})
      const additional = object.additionalProperties

      return (
        properties.some((property) => needsCoercion(property, seen)) ||
        (typeof additional === 'object' && needsCoercion(additional, seen))
      )
    })
    .with(
      { type: 'union' },
      (union) => union.members.some((member) => needsCoercion(member, seen)),
    )
    .with({ type: 'string' }, () => false)
    .with({ type: 'unknown' }, () => false)
    .with({ type: 'void' }, () => false)
    .with({ type: 'custom' }, () => false)
    .exhaustive()
}
