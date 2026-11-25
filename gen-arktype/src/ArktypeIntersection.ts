import type { GenerateContextType, GeneratorKey, Modifiers, OasIntersection, RefParts } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyValueModifiers } from './applyModifiers.ts'
import { type ArktypeValue, toArktypeValue } from './Arktype.ts'
import { ArktypeRef } from './ArktypeRef.ts'
import { assertNoMemberLoop } from './memberLoop.ts'

type ArktypeIntersectionArgs = {
  context: GenerateContextType
  schema: OasIntersection
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefParts
}

/** `animal.and({ "name?": "string" })` */
export class ArktypeIntersection extends TsSnippet {
  type = 'intersection' as const
  // `.and(…)` is a method of a `Type` value, which string syntax has not.
  stringSyntax = undefined
  atomicStringSyntax = undefined
  members: ArktypeValue[]
  modifiers: Modifiers
  /** The first member is a model's `Type`, which has `.and` without a `type(…)` around it. */
  startsWithType: boolean
  /** Renders a `Type` value, not a definition of one. */
  isType: boolean

  constructor({ context, schema, modifiers, destinationPath, generatorKey, rootRef }: ArktypeIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    assertNoMemberLoop(schema)

    this.modifiers = modifiers

    this.members = schema.members.map(member =>
      toArktypeValue({ schema: member, required: true, destinationPath, context, rootRef })
    )

    const [first] = this.members

    this.startsWithType = first instanceof ArktypeRef && !first.modifiers.nullable
    this.isType = modifiers.required === true && !modifiers.nullable

    if (!this.startsWithType) {
      this.register({ imports: { arktype: ['type'] }, destinationPath })
    }
  }

  override toString(): string {
    const [first, ...rest] = this.members
    const head = this.startsWithType ? `${first}` : `type(${first})`

    return applyValueModifiers(`${head}${rest.map(member => `.and(${member})`).join('')}`, this.modifiers)
  }
}
