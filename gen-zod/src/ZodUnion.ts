import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasDiscriminator,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue
} from '@skmtc/core'
import { toZodValue } from './Zod.ts'
import { Loop, Wrap } from './Maybe.ts'
import { ZodModifiers } from './ZodModifiers.ts'

type ZodUnionArgs = {
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

export class ZodUnion extends TsSnippet {
  type = 'union' as const
  members: TypeSystemValue[]
  discriminator: string | undefined
  modifiers: Modifiers
  content: Wrap
  modifierCalls: ZodModifiers

  constructor({
    context,
    generatorKey,
    destinationPath,
    members,
    discriminator,
    modifiers,
    rootRef,
    schema
  }: ZodUnionArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.members = members.map(member => {
      return toZodValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef
      })
    })

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers
    this.modifierCalls = new ZodModifiers(modifiers)

    const memberList = new Loop(this.members)

    this.content = this.discriminator
      ? new Wrap(['z.discriminatedUnion("', this.discriminator, '", [', memberList, '])'])
      : new Wrap(['z.union([', memberList, '])'])

    this.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `${this.content}${this.modifierCalls}`
  }
}
