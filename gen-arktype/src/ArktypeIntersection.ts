import type { OasIntersection } from '@skmtc/core'
import type { GenerateContextType, Modifiers, GeneratorKey, RefParts } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyValueModifiers } from './applyModifiers.ts'
import { type ArktypeValue, toArktypeValue } from './Arktype.ts'

type ArktypeIntersectionArgs = {
  schema: OasIntersection
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefParts
}

export class ArktypeIntersection extends TsSnippet {
  type = 'intersection' as const
  // An intersection holds a ref, which string syntax cannot spell (see
  // ArktypeRef), so it is a definition value.
  stringSyntax = undefined
  atomicStringSyntax = undefined
  members: ArktypeValue[]
  modifiers: Modifiers

  constructor({ context, modifiers, destinationPath, generatorKey, rootRef, schema }: ArktypeIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers

    this.members = schema.members.map(member =>
      toArktypeValue({
        schema: member,
        required: true,
        destinationPath,
        context,
        rootRef
      })
    )
  }

  override toString(): string {
    // Arktype's intersection tuple is binary, as its union tuple is (see
    // ArktypeUnion), so members fold left into nested pairs.
    const folded = this.members.map(member => `${member}`).reduce((left, right) => `[${left}, "&", ${right}]`)

    return applyValueModifiers(folded, this.modifiers)
  }
}
