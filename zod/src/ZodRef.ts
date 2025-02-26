import { ModelDriver, toModelGeneratorKey, ValueBase } from '@skmtc/core'
import type { GenerateContext, Modifiers, RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { ZodInsertable } from './ZodInsertable.ts'
import { zodConfig } from './config.ts'
type ConstructorProps = {
  context: GenerateContext
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
}

export class ZodRef extends ValueBase {
  type = 'ref' as const
  modifiers: Modifiers
  name: string
  constructor({ context, refName, destinationPath, modifiers }: ConstructorProps) {
    super({ context, generatorKey: toModelGeneratorKey({ generatorId: zodConfig.id, refName }) })

    const zodDriver = new ModelDriver({
      context,
      refName,
      generation: 'force',
      destinationPath,
      insertable: ZodInsertable,
    })

    this.name = zodDriver.settings.identifier.name
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(this.name, this.modifiers)
  }
}
