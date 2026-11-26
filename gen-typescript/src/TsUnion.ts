import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, OasDiscriminator, OasSchema, OasRef, Modifiers, TypeSystemValue, RefParts } from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { applyModifiers } from './applyModifiers.ts'
import { toDirectNames } from './directNames.ts'

type TsUnionArgs = {
  context: GenerateContextType
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  /** The originating union schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  discriminator?: OasDiscriminator
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefParts
}

export class TsUnion extends TsSnippet {
  type = 'union' as const
  members: TypeSystemValue[]
  discriminator: string | undefined
  modifiers: Modifiers
  /** See `toDirectNames`. */
  directNames: string[]

  constructor({
    context,
    generatorKey,
    destinationPath,
    members,
    discriminator,
    modifiers,
    rootRef,
    schema
  }: TsUnionArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.members = members.map(member => {
      return toTsValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef
      })
    })

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers
    this.directNames = this.members.flatMap(toDirectNames)
  }

  override toString(): string {
    const members = this.members.map(member => `${member}`).join(' | ')

    return applyModifiers(members, this.modifiers)
  }
}
