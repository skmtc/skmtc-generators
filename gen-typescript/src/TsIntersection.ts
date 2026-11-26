import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, OasIntersection, Modifiers, TypeSystemValue, RefParts } from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { applyModifiers } from './applyModifiers.ts'

type TsIntersectionArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: OasIntersection
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefParts
}

export class TsIntersection extends TsSnippet {
  type = 'intersection' as const
  members: TypeSystemValue[]
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, rootRef, schema }: TsIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.members = schema.members.map(member => {
      return toTsValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef
      })
    })

    this.modifiers = modifiers
  }

  override toString(): string {
    // Each member is in parentheses: `&` binds tighter than the `|` of a
    // member that is a union, an enum or nullable.
    const members = this.members.map(member => `(${member})`).join(' & ')

    return applyModifiers(members, this.modifiers)
  }
}
