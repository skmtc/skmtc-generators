import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  OasDiscriminator,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue,
} from '@skmtc/core'
import { toEffectValueImpl } from './Effect.ts'
import {
  applyModifiers,
  type EffectModifiers,
  libImports,
} from './modifiers.ts'
import { LIB, LIB_MODULE } from './lib.ts'

type EffectUnionArgs = {
  context: GenerateContextType
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  /** The originating union schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  discriminator?: OasDiscriminator
  modifiers: EffectModifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
  coerce?: boolean
}

export class EffectUnion extends TsSnippet {
  type = 'union' as const
  members: TypeSystemValue[]
  /**
   * Kept for the TypeSystem contract; not rendered. `Schema.Union`
   * has no discriminated form — it picks the member by decoding, and
   * a literal tag on each member narrows the type the same way.
   */
  discriminator: string | undefined
  modifiers: EffectModifiers

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      members,
      discriminator,
      modifiers,
      rootRef,
      coerce = false,
      schema,
    }: EffectUnionArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.members = members.map((member) =>
      toEffectValueImpl({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef,
        coerce,
      })
    )

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers

    this.register({
      imports: { [LIB_MODULE]: libImports(modifiers) },
      destinationPath,
    })
  }

  override toString(): string {
    const members = this.members.map((member) => `${member}`).join(', ')

    return applyModifiers(`${LIB}.Union([${members}])`, this.modifiers)
  }
}
