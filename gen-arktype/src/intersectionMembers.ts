// gen-arktype, gen-typescript, gen-valibot and gen-zod each have a copy of this
// file, so that a clone of one needs no other. test-support checks that the
// copies are the same.
import { OasObject } from '@skmtc/core'
import type { OasIntersection, OasRef, OasSchema, StackTrail } from '@skmtc/core'
import { assertNoMemberLoop } from './memberLoop.ts'

type Member = OasSchema | OasRef<'schema'>

/** The intersections whose members are being built, by their trail. */
const open = new Set<StackTrail>()

/** Builds each member with `toValue`, or fails with an error that names the schema. */
export const buildMembers = <Value>(intersection: OasIntersection, toValue: (member: Member) => Value): Value[] => {
  const { stackTrail } = intersection

  assertNoMemberLoop(intersection)

  // `children` of Node holds `allOf: [Node, { required: ['children'] }]`: to
  // write that member's `children` is to write the intersection again.
  if (open.has(stackTrail)) {
    throw new Error(
      `${stackTrail.toSchemaPointer()} cannot be rendered as an intersection: it requires a property of another member that holds the intersection itself.`
    )
  }

  open.add(stackTrail)

  try {
    return intersection.members.map(member => toValue(withRequired(member, intersection)))
  } finally {
    open.delete(stackTrail)
  }
}

/**
 * An object with the properties it requires and another member declares
 * (`{ required: ['id'] }` beside a reference to a model with `id`). An object
 * renders the keys of its own properties only, so the others would stay
 * optional.
 */
const withRequired = (member: Member, intersection: OasIntersection): Member => {
  if (!(member instanceof OasObject)) {
    return member
  }

  const own = member.properties ?? {}

  const parts = intersection.toParts().filter(part => part instanceof OasObject)

  const added = (member.required ?? []).flatMap(key => {
    const part = Object.hasOwn(own, key) ? undefined : parts.find(({ properties }) => properties && Object.hasOwn(properties, key))
    const schema = part?.properties?.[key]

    return schema === undefined ? [] : [[key, schema] as const]
  })

  if (added.length === 0) {
    return member
  }

  const object = new OasObject({
    nullable: member.nullable,
    properties: { ...own, ...Object.fromEntries(added) },
    required: member.required,
    additionalProperties: member.additionalProperties
  })
  object.stackTrail = member.stackTrail

  return object
}
