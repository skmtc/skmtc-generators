import { ContentBase } from '@skmtc/core'
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'
import type {
  GenerateContext,
  GeneratorKey,
  RefName,
  TypeSystemValue,
  Modifiers,
  OasRef,
  OasSchema
} from '@skmtc/core'

type ValibotArrayArgs = {
  context: GenerateContext
  destinationPath: string
  items: OasSchema | OasRef<'schema'>
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ValibotArray extends ContentBase {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, items, modifiers, rootRef }: ValibotArrayArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    this.items = toValibotValue({
      destinationPath,
      schema: items,
      required: true,
      context,
      rootRef
    })

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    const content = `v.array(${this.items})`
    return applyModifiers(content, this.modifiers)
  }
}