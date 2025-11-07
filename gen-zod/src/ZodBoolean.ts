import { applyModifiers } from './applyModifiers.ts'
import { type Modifiers, type GeneratorKey, ContentBase, type GenerateContextType } from '@skmtc/core'

type ZodBooleanArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ZodBoolean extends ContentBase {
  type = 'boolean' as const
  modifiers: Modifiers

  constructor({ context, modifiers, destinationPath, generatorKey }: ZodBooleanArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    context.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return applyModifiers(`z.boolean()`, this.modifiers)
  }
}
