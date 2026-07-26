import type { OasDiscriminator, OasRef, OasSchema } from '@skmtc/core'
import type { GenerateContextType, Modifiers, GeneratorKey, RefName } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers, applyValueModifiers } from './applyModifiers.ts'
import { toAtomicSyntax } from './toAtomicSyntax.ts'
import { type ArktypeValue, toArktypeValue } from './Arktype.ts'

type ArktypeUnionArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  members: (OasSchema | OasRef<'schema'>)[]
  discriminator?: OasDiscriminator
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeUnion extends TsSnippet {
  type = 'union' as const
  members: ArktypeValue[]
  discriminator: string | undefined
  modifiers: Modifiers
  stringSyntax: string | undefined
  atomicStringSyntax: string | undefined

  constructor({
    context,
    members,
    discriminator,
    modifiers,
    destinationPath,
    generatorKey,
    rootRef,
    schema
  }: ArktypeUnionArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers

    this.members = members.map(member =>
      toArktypeValue({
        schema: member,
        required: true,
        destinationPath,
        context,
        rootRef
      })
    )

    // A union is spellable in string syntax only when every member is.
    const memberSyntaxes = this.members.flatMap(member => member.stringSyntax ?? [])

    this.stringSyntax =
      memberSyntaxes.length === this.members.length && memberSyntaxes.length > 0
        ? applyModifiers(memberSyntaxes.join(' | '), modifiers)
        : undefined

    this.atomicStringSyntax =
      this.stringSyntax === undefined ? undefined : toAtomicSyntax(this.stringSyntax)
  }

  override toString(): string {
    if (this.stringSyntax !== undefined) {
      return `"${this.stringSyntax}"`
    }

    // Arktype's union tuple is binary, so members fold left into nested pairs:
    // `[[a, "|", b], "|", c]`. A flat `[a, "|", b, "|", c]` silently drops
    // everything past the first pair.
    const memberValues = this.members.map(member => `${member}`)

    const folded =
      memberValues.length === 0
        ? '"never"'
        : memberValues.reduce((left, right) => `[${left}, "|", ${right}]`)

    return applyValueModifiers(folded, this.modifiers)
  }
}
