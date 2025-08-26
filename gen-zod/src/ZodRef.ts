import { ModelDriver, toModelGeneratorKey, ContentBase } from '@skmtc/core'
import type { GenerateContext, Modifiers, RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { ZodInsertable } from './ZodInsertable.ts'
import { zodEntry } from './mod.ts'
type ConstructorProps = {
  context: GenerateContext
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
}

export class ZodRef extends ContentBase {
  type = 'ref' as const
  modifiers: Modifiers
  name: string
  terminal: boolean
  constructor({ context, refName, destinationPath, modifiers, rootRef }: ConstructorProps) {
    super({ context, generatorKey: toModelGeneratorKey({ generatorId: zodEntry.id, refName }) })

    if (context.modelDepth[zodEntry.id] > 0) {
      const settings = context.toModelContentSettings({
        refName,
        insertable: ZodInsertable
      })

      context.register({ imports: { zod: ['z'] }, destinationPath: settings.exportPath })

      this.name = settings.identifier.name
      this.modifiers = modifiers
      this.terminal = true
    } else {
      const { settings } = new ModelDriver({
        context,
        refName,
        generation: 'force',
        destinationPath,
        rootRef,
        insertable: ZodInsertable
      })

      this.name = settings.identifier.name
      this.modifiers = modifiers
      this.terminal = false
    }
  }

  override toString(): string {
    const out = applyModifiers(this.name, this.modifiers)
    return this.terminal ? `z.lazy(() => ${out})` : out
  }
}
