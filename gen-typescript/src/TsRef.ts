import { ModelDriver, toModelGeneratorKey, SnippetBase } from '@skmtc/core'
import type { GenerateContextType, Modifiers, RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { TsProjection } from './TsProjection.ts'
import { typescriptEntry } from './mod.ts'

type TsRefConstructorProps = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
}

export class TsRef extends SnippetBase {
  type = 'ref' as const
  name: string
  modifiers: Modifiers
  terminal: boolean
  constructor({ context, refName, modifiers, destinationPath, rootRef }: TsRefConstructorProps) {
    super({
      context,
      generatorKey: toModelGeneratorKey({ generatorId: typescriptEntry.id, refName })
    })

    if (context.modelDepth[`${typescriptEntry.id}:${refName}`] > 0) {
      const settings = context.toModelContentSettings({
        refName,
        projection: TsProjection
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
        rootRef
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
