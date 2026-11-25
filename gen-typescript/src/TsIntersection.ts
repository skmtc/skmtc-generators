import { isEmpty } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasIntersection,
  OasRef,
  OasSchema,
  RefParts,
  TypeSystemValue
} from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { TsObject } from './TsObject.ts'
import { TsRef } from './TsRef.ts'
import { TsUnion } from './TsUnion.ts'
import { TsUnknown } from './TsUnknown.ts'
import { applyModifiers } from './applyModifiers.ts'
import { buildMembers } from './intersectionMembers.ts'

type TsIntersectionArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: OasIntersection
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefParts
}

/** `Animal & {name?: string}` */
export class TsIntersection extends TsSnippet {
  type = 'intersection' as const
  members: TypeSystemValue[]
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, rootRef, schema }: TsIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    const toAnyKeys = (member: OasSchema | OasRef<'schema'>): TsAnyKeys =>
      new TsAnyKeys({ context, generatorKey, stackTrail: member.stackTrail.clone() })

    this.members = buildMembers(schema, member => {
      if (hasNoKeys(member)) {
        return toAnyKeys(member)
      }

      const value = toTsValue({ destinationPath, schema: member, required: true, context, rootRef })

      // `anyOf: [{ required: ['a'] }, { required: ['b'] }]`
      if (value instanceof TsUnion && 'members' in member) {
        value.members = value.members.map((branch, index) =>
          hasNoKeys(member.members[index]) ? toAnyKeys(member.members[index]) : branch
        )
      }

      return value
    })
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(this.members.map(toOperand).join(' & '), this.modifiers)
  }
}

/**
 * A member, or a branch of one that is a union, that is an object with no keys
 * of its own (`{ minProperties: 1 }`). An object like that renders `Record<string, never>` elsewhere, which would
 * refuse the keys of the other members.
 */
class TsAnyKeys extends TsSnippet {
  type = 'unknown' as const

  override toString(): string {
    return '{}'
  }
}

const hasNoKeys = (member: OasSchema | OasRef<'schema'>): boolean => {
  const schema = member.resolve()

  return (
    !schema.nullable &&
    'properties' in schema &&
    isEmpty(schema.properties ?? {}) &&
    !schema.additionalProperties
  )
}

/** A member as an operand of `&`, which binds tighter than `|`. */
const toOperand = (member: TypeSystemValue): string =>
  member instanceof TsAnyKeys ||
  member instanceof TsUnknown ||
  ((member instanceof TsRef || member instanceof TsObject) && !member.modifiers.nullable)
    ? `${member}`
    : `(${member})`
