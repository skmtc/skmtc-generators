import { ContentBase } from '@skmtc/core'
import type {
  GenerateContextType,
  GeneratorKey,
  RefName,
  TypeSystemValue,
  Modifiers,
  OasRef,
  OasSchema,
  OasDiscriminator
} from '@skmtc/core'
import { toZodValue } from './Zod.ts'
import { applyModifiers } from './applyModifiers.ts'

type ZodUnionArgs = {
  context: GenerateContextType
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  discriminator?: OasDiscriminator
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ZodUnion extends ContentBase {
  type = 'union' as const
  members: TypeSystemValue[]
  discriminator: string | undefined
  modifiers: Modifiers

  constructor({
    context,
    generatorKey,
    destinationPath,
    members,
    discriminator,
    modifiers,
    rootRef
  }: ZodUnionArgs) {
    super({ context, generatorKey })

    this.members = members.map(member => {
      return toZodValue({ destinationPath, schema: member, required: true, context, rootRef })
    })

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers

    context.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    const members = this.members.map(member => `${member}`).join(', ')

    const content = this.discriminator
      ? `z.discriminatedUnion("${this.discriminator}", [${members}])`
      : `z.union([${members}])`

    return applyModifiers(content, this.modifiers)
  }
}
