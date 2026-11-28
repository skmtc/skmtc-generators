import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, OasIntersection, Modifiers, TypeSystemValue, RefParts } from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { applyModifiers } from './applyModifiers.ts'

type TsIntersectionArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: OasIntersection
  /** The members to render: the router leaves out those that constrain nothing. Defaults to `schema.members`. */
  members?: OasIntersection['members']
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefParts
}

export class TsIntersection extends TsSnippet {
  type = 'intersection' as const
  members: TypeSystemValue[]
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, members, modifiers, rootRef, schema }: TsIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.members = (members ?? schema.members).map(member => {
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
    // Each member of two or more is in parentheses: `&` binds tighter than
    // the `|` of a member that is a union, an enum or nullable. A lone
    // member is the whole type, and no member at all allows any value.
    const members =
      this.members.length > 1
        ? this.members.map(member => `(${member})`).join(' & ')
        : `${this.members[0] ?? 'unknown'}`

    return applyModifiers(members, this.modifiers)
  }
}
