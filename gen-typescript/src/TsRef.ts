import { ModelDriver, toModelGeneratorKey, SnippetBase } from '@skmtc/core'
import type {
  GenerateContextType,
  Modifiers,
  OasRef,
  OasSchema,
  RefName
} from '@skmtc/core'
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

export class TsRef extends SnippetBase {
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
      schema
    })

    if (context.modelDepth[`${typescriptEntry.id}:${refName}`] > 0) {
      const settings = context.toModelContentSettings({
        refName,
        projection: TsProjection,
        variant: 'main'
      })

      this.name = settings.identifier.name
      this.modifiers = modifiers
      this.terminal = true
    } else {
      const tsDriver = new ModelDriver({
        context,
        refName,
        destinationPath,
        projection: TsProjection,
        rootRef,
        variant: 'main'
      })

      this.name = tsDriver.settings.identifier.name
      this.modifiers = modifiers
      this.terminal = false
    }
  }

  override toString(): string {
    return applyModifiers(this.name, this.modifiers)
  }
}
