import { DanglingRefError } from '@skmtc/core'
import type { OasRef, OasSchema, SchemaType } from '@skmtc/core'

/**
 * Whether a value at a site can be null. An intersection can be when each of its
 * members can: Kotlin writes it as one class, which none of their `?` is on.
 */
export const isNullable = (schema: SchemaType): boolean | undefined => {
  if ('nullable' in schema && schema.nullable) {
    return true
  }

  return 'members' in schema && !('discriminator' in schema)
    ? schema.members.every(allowsNull)
    : 'nullable' in schema
    ? schema.nullable
    : undefined
}

const allowsNull = (member: OasSchema | OasRef<'schema'>): boolean => {
  if (member.isRef()) {
    const target = member.nullable ? undefined : toTarget(member)

    return member.nullable === true || (target !== undefined && allowsNull(target))
  }

  // Any value (`{ description }`) can be null.
  return isNullable(member) === true || !hasRules(member)
}

const hasRules = (schema: OasSchema): boolean =>
  // deno-lint-ignore skmtc/single-dispatch -- it answers a question about the schema; it decides no output, which is the router's
  schema.type !== 'unknown'

const toTarget = (ref: OasRef<'schema'>): OasSchema | undefined => {
  try {
    return ref.resolve()
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return undefined
    }

    throw error
  }
}
