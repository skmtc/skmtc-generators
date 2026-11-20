import { DanglingRefError, type OasRef, type OasSchema } from '@skmtc/core'

/**
 * Resolve a reference, or `undefined` when it names nothing in the document.
 * The parser keeps such a `$ref` only when `system.danglingRefs` lists its
 * kind, and the docs then mark it with an `UnresolvedMarker` instead of
 * failing the whole document. Any other error throws.
 */
export const safeResolve = <T>(ref: { resolve: () => T }): T | undefined => {
  try {
    return ref.resolve()
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return undefined
    }

    throw error
  }
}

/** What a schema site shows: see {@link toSiteSchema}. */
export type SiteSchema =
  /** The schema, or the schema its `$ref` names, with the keywords next to the `$ref` applied. */
  | { type: 'schema'; schema: OasSchema }
  /** A `$ref` to a component that is itself a `$ref` (an alias), which has its own definition. */
  | { type: 'alias' }
  /** A `$ref` that names nothing. */
  | { type: 'dangling' }

/**
 * The schema a site shows, from one lookup. A `$ref` that names a schema
 * resolves, with the keywords next to it applied: one lookup, so it always
 * ends. A `$ref` that names another `$ref` (an alias, as in
 * `account_id: { $ref: identifier }`) is not followed. The alias is a type of
 * its own, defined where it is linked to, and its definition links on to what
 * it names. So a chain that loops (`A` is a `$ref` to `B`, and `B` to `A`)
 * never resolves: each link finds the type already in the document.
 */
export const toSiteSchema = (schema: OasSchema | OasRef<'schema'>): SiteSchema => {
  if (!schema.isRef()) {
    return { type: 'schema', schema }
  }

  try {
    return schema.resolveOnce().isRef() ? { type: 'alias' } : { type: 'schema', schema: schema.resolve() }
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return { type: 'dangling' }
    }

    throw error
  }
}
