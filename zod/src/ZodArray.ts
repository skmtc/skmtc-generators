import { ValueBase, type GenerateContext, type GeneratorKey } from '@skmtc/core'
import type { OasRef } from '@skmtc/core'
import type { OasSchema } from '@skmtc/core'
import { toZodValue } from './Zod.ts'
import type { TypeSystemValue } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers } from '@skmtc/core'

type ZodArrayArgs = {
  context: GenerateContext
  destinationPath: string
  items: OasSchema | OasRef<'schema'>
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class ZodArray extends ValueBase {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, items, modifiers }: ZodArrayArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    this.items = toZodValue({ destinationPath, schema: items, required: true, context })
  }

  override toString(): string {
    return applyModifiers(`z.array(${this.items})`, this.modifiers)
  }
}
