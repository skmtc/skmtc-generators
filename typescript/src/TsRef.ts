import { ModelDriver, toModelGeneratorKey, ValueBase } from '@skmtc/core'
import type { GenerateContext, Modifiers, RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { TsInsertable } from './TsInsertable.ts'
import { typescriptConfig } from './config.ts'

type TsRefConstructorProps = {
  context: GenerateContext
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
}

export class TsRef extends ValueBase {
  type = 'ref' as const
  name: string
  modifiers: Modifiers

  constructor({ context, refName, modifiers, destinationPath }: TsRefConstructorProps) {
    super({ context, generatorKey: toModelGeneratorKey({ generatorId: typescriptConfig.id, refName }) })

    const tsDriver = new ModelDriver({
      context,
      refName,
      generation: 'force',
      destinationPath,
      insertable: TsInsertable,
    })

    this.name = tsDriver.settings.identifier.name
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(this.name, this.modifiers)
  }
}
