// Each generator that renders schemas has its own copy of this file, so that a
// clone of one needs no other. test-support checks that the copies are the same.
import { DanglingRefError } from '@skmtc/core'
import type { OasIntersection, OasRef, OasSchema } from '@skmtc/core'

/**
 * Fails when a member of the intersection leads back to the intersection
 * through references, unions and intersections only (inheritance: `Payment` is
 * `oneOf: [Card]`, and `Card` is `allOf: [Payment, …]`). Such a loop has no
 * value to stop at. TypeScript refuses its type (TS2456), and a validator
 * recurses until the stack overflows. A loop through a property, an array item
 * or a record is not one.
 */
export const assertNoMemberLoop = (intersection: OasIntersection): void => {
  const loop = toMemberLoop({ intersection, members: intersection.members, path: [], seen: new Set() })

  if (loop !== undefined) {
    throw new Error(
      `${intersection.stackTrail.toSchemaPointer()} cannot be rendered as an intersection: its members lead back to it with no property between, through ${loop.join(' → ') || 'itself'}. Remove the loop from the schema.`
    )
  }
}

type ToMemberLoopArgs = {
  intersection: OasIntersection
  members: (OasSchema | OasRef<'schema'>)[]
  /** The names of the references on the way. */
  path: string[]
  /** The references already followed. */
  seen: Set<string>
}

/** The names of the references that lead back to the intersection, or `undefined`. */
const toMemberLoop = ({ intersection, members, path, seen }: ToMemberLoopArgs): string[] | undefined => {
  for (const member of members) {
    const loop = toLoopThrough({ intersection, member, path, seen })

    if (loop !== undefined) {
      return loop
    }
  }

  return undefined
}

type ToLoopThroughArgs = {
  intersection: OasIntersection
  member: OasSchema | OasRef<'schema'>
  path: string[]
  seen: Set<string>
}

const toLoopThrough = ({ intersection, member, path, seen }: ToLoopThroughArgs): string[] | undefined => {
  if (member.isRef()) {
    if (seen.has(member.$ref)) {
      return undefined
    }

    seen.add(member.$ref)

    const target = toTarget(member)

    return target === undefined
      ? undefined
      : toLoopThrough({ intersection, member: target, path: [...path, member.refName], seen })
  }

  // A copy that a reference resolved to shares its trail with the original.
  if (member === intersection || member.stackTrail === intersection.stackTrail) {
    return path
  }

  return 'members' in member ? toMemberLoop({ intersection, members: member.members, path, seen }) : undefined
}

/** What a reference names, or `undefined` when it names nothing. */
const toTarget = (ref: OasRef<'schema'>): OasSchema | OasRef<'schema'> | undefined => {
  try {
    return ref.resolveOnce()
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return undefined
    }

    throw error
  }
}
