import { TsSnippet } from '@skmtc/lang-typescript'
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'
import type { GenerateContextType, GeneratorKey, RefName, TypeSystemValue, Modifiers, OasRef, OasSchema } from '@skmtc/core'

type ValibotArrayArgs = {
  context: GenerateContextType
  destinationPath: string
  items: OasSchema | OasRef<'schema'>
  /** The originating array schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ValibotArray extends TsSnippet {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor({
    context,
    generatorKey,
    destinationPath,
    items,
    modifiers,
    rootRef,
    schema
  }: ValibotArrayArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    this.items = toValibotValue({
      destinationPath,
      schema: items,
      required: true,
      context,
      rootRef
    })

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const content = `v.array(${this.items})`
    return applyModifiers(content, this.modifiers)
  }
}
