import { ContentBase } from '@skmtc/core'
import type {
  OasRef,
  RefName,
  GenerateContextType,
  GeneratorKey,
  OasSchema,
  Modifiers,
  TypeSystemValue
} from '@skmtc/core'
import { toZodValue } from './Zod.ts'
import { applyModifiers } from './applyModifiers.ts'

type ZodArrayArgs = {
  context: GenerateContextType
  destinationPath: string
  items: OasSchema | OasRef<'schema'>
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ZodArray extends ContentBase {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, items, modifiers, rootRef }: ZodArrayArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    this.items = toZodValue({ destinationPath, schema: items, required: true, context, rootRef })

    context.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return applyModifiers(`z.array(${this.items})`, this.modifiers)
  }
}
