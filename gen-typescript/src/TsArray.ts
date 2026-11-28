import { TsSnippet } from '@skmtc/lang-typescript'
import type { TypeSystemValue, OasSchema, Modifiers, GeneratorKey, GenerateContextType, OasRef } from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { applyModifiers } from './applyModifiers.ts'

type TsArrayArgs = {
  context: GenerateContextType
  destinationPath: string
  items: OasSchema | OasRef<'schema'>
  /** The originating array schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class TsArray extends TsSnippet {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor(
    { context, generatorKey, destinationPath, items, modifiers, schema }: TsArrayArgs
  ) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    this.items = toTsValue({ destinationPath, schema: items, required: true, context })
  }

  override toString(): string {
    return applyModifiers(`Array<${this.items}>`, this.modifiers)
  }
}
