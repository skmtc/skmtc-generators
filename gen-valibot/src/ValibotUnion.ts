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
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'

type ValibotUnionArgs = {
  context: GenerateContextType
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  discriminator?: OasDiscriminator
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ValibotUnion extends ContentBase {
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
  }: ValibotUnionArgs) {
    super({ context, generatorKey })

    this.members = members.map(member => {
      return toValibotValue({ destinationPath, schema: member, required: true, context, rootRef })
    })

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers

    context.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const members = this.members.map(member => `${member}`).join(', ')

    const content = this.discriminator ? this.buildVariantUnion() : `v.union([${members}])`

    return applyModifiers(content, this.modifiers)
  }

  private buildVariantUnion(): string {
    if (!this.discriminator) return `v.union([${this.members.join(', ')}])`

    // Extract discriminator values from each member
    const variants: Record<string, string> = {}

    this.members.forEach(member => {
      const memberStr = member.toString()

      // Try to extract the discriminator value from the member string
      // This is a simplified approach - in a real implementation you might need more sophisticated parsing
      const literalMatch = memberStr.match(
        new RegExp(`${this.discriminator}: v\\.literal\\("([^"]+)"\\)`)
      )
      if (literalMatch) {
        const value = literalMatch[1]
        variants[value] = memberStr
      }
    })

    const variantEntries = Object.entries(variants)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')

    return `v.variant("${this.discriminator}", {${variantEntries}})`
  }
}
