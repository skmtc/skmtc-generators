import type { OasRef, OasSchema } from '@skmtc/core'
import { EmptySelection, ScalarSelection, type Selection } from './Selection.ts'
import { ObjectSelection } from './ObjectSelection.ts'

type ToSelectionArgs = {
  schema: OasSchema | OasRef<'schema'>
  visited?: Set<string>
  depth?: number
  maxDepth?: number
}

/**
 * SKMTC sometimes models `$ref + nullable` as a one-member union
 * (see skill §16: "single-member intersection unwrap"). Walk past those
 * wrappers before dispatching, so the discriminator switch sees the
 * underlying schema. Narrowing flows through `.isRef()` (type predicate)
 * and `.type === 'union'` (discriminator on OasSchema), so no `as`
 * casts are needed.
 */
const unwrap = (
  schema: OasSchema | OasRef<'schema'>
): OasSchema | OasRef<'schema'> => {
  let current = schema
  while (
    !current.isRef() &&
    current.type === 'union' &&
    current.members.length === 1
  ) {
    current = current.members[0]
  }
  return current
}

/**
 * Dispatch an OAS schema to the appropriate {@link Selection} variant.
 *
 * Mirrors the shape of `gen-zod`'s `toZodValue`: an exhaustive switch
 * over `schema.type` with a `_exhaustive: never` floor that turns a
 * future OAS variant addition into a compile error rather than a
 * silent fall-through. New branches go here — no other site needs
 * changing.
 *
 * Refs resolve at this layer with cycle break; depth-limit stops
 * unbounded recursion through self-referential types. Both happen
 * before the switch so the dispatcher only ever sees a concrete
 * schema object.
 */
export const toSelection = ({
  schema,
  visited = new Set(),
  depth = 0,
  maxDepth = 4
}: ToSelectionArgs): Selection => {
  const unwrapped = unwrap(schema)

  if (unwrapped.isRef()) {
    const refName = unwrapped.toRefName()
    if (visited.has(refName)) return new EmptySelection()
    const nextVisited = new Set(visited)
    nextVisited.add(refName)
    return toSelection({
      schema: unwrapped.resolve(),
      visited: nextVisited,
      depth,
      maxDepth
    })
  }

  switch (unwrapped.type) {
    case 'object':
      // Depth gate sits here, not at function entry. Scalars are
      // cheap — blocking them at depth wastes selection coverage.
      // Objects are where unbounded recursion through self-referential
      // schemas would happen, so this is the only branch that needs
      // bounding.
      if (depth >= maxDepth) return new EmptySelection()
      return new ObjectSelection({ schema: unwrapped, visited, depth, maxDepth })
    case 'array':
      return unwrapped.items
        ? toSelection({ schema: unwrapped.items, visited, depth, maxDepth })
        : new EmptySelection()
    case 'union':
      // Multi-member unions need GraphQL inline fragments. v1 doesn't
      // emit those; skip the field rather than produce invalid output.
      return new EmptySelection()
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
    case 'void':
    case 'unknown':
    case 'custom':
      return new ScalarSelection()
    default: {
      const _exhaustive: never = unwrapped
      throw new Error(
        `toSelection: unhandled schema type ${(_exhaustive as { type: string }).type}`
      )
    }
  }
}
