import { toModelGeneratorKey, toModelRef } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, Modifiers, OasRef, OasSchema, RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { TsProjection } from './TsProjection.ts'
import { typescriptEntry } from './mod.ts'

type TsRefConstructorProps = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class TsRef extends TsSnippet {
  type = 'ref' as const
  name: string
  modifiers: Modifiers
  terminal: boolean
  constructor(
    { context, refName, modifiers, destinationPath, rootRef, schema }: TsRefConstructorProps
  ) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: typescriptEntry.id,
        refName,
        variant: 'main'
      }),
      stackTrail: schema?.stackTrail.clone()
    })

    // A reference back to a model whose projection is being constructed
    // comes back `suspended`, so the model is not constructed again. A type
    // alias may name itself, so it renders like any other reference.
    const ref = toModelRef({
      context,
      refName,
      destinationPath,
      projection: TsProjection,
      rootRef,
      variant: 'main'
    })

    this.name = ref.settings.identifier.name
    this.modifiers = modifiers
    this.terminal = ref.suspended
  }

  override toString(): string {
    return applyModifiers(this.name, this.modifiers)
  }
}
