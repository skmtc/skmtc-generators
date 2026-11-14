import { toStringLiteral, TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, RefName, TypeSystemValue, Modifiers, OasRef, OasSchema, OasDiscriminator } from '@skmtc/core'
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'
import { isVariantOption } from './variant.ts'

type ValibotUnionArgs = {
  context: GenerateContextType
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  /** The originating union schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  discriminator?: OasDiscriminator
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ValibotUnion extends TsSnippet {
  type = 'union' as const
  members: TypeSystemValue[]
  /** The key `v.variant` switches on, when every member can be its option. */
  discriminator: string | undefined
  modifiers: Modifiers

  constructor({
    context,
    generatorKey,
    destinationPath,
    members,
    discriminator,
    modifiers,
    rootRef,
    schema
  }: ValibotUnionArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.members = members.map(member => {
      return toValibotValue({ destinationPath, schema: member, required: true, context, rootRef })
    })

    // See `isVariantOption`. With a member valibot does not type as an
    // option, the union renders `v.union`, which accepts the same values.
    const key = discriminator?.propertyName

    this.discriminator =
      key !== undefined && this.members.every(member => isVariantOption(member, key)) ? key : undefined
    this.modifiers = modifiers

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const members = this.members.map(member => `${member}`).join(', ')

    const content = this.discriminator
      ? `v.variant(${toStringLiteral(this.discriminator)}, [${members}])`
      : `v.union([${members}])`

    return applyModifiers(content, this.modifiers)
  }
}
