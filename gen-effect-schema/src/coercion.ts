import type { SchemaType } from '@skmtc/core'

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
  // deno-lint-ignore skmtc/single-dispatch -- it answers a question about the schema; it decides no output, which is the router's
  switch (schema.type) {
    case 'ref':
      if (seen.has(schema.$ref)) return false

      seen.add(schema.$ref)

      return needsCoercion(schema.resolveOnce(), seen)
    case 'number':
    case 'integer':
    case 'boolean':
    case 'array':
      return true
    case 'object': {
      const properties = Object.values(schema.properties ?? {})
      const additional = schema.additionalProperties

      return (
        properties.some((property) => needsCoercion(property, seen)) ||
        (typeof additional === 'object' && needsCoercion(additional, seen))
      )
    }
    case 'union':
      return schema.members.some((member) => needsCoercion(member, seen))
    case 'string':
    case 'unknown':
    case 'void':
    case 'custom':
      return false
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${_exhaustive}`)
    }
  }
}
