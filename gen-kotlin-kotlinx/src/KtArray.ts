import { KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasArray,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toKtValue } from './Kt.ts'

type KtArrayArgs = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  items: OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
  schema: OasArray
  fallbackName: string
}

/** Array schema → `List<T>`. */
export class KtArray extends KtSnippet {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor({ context, destinationPath, modifiers, items, generatorKey, rootRef, schema, fallbackName }: KtArrayArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers

    this.items = toKtValue({
      schema: items,
      destinationPath,
      required: true,
      context,
      rootRef,
      fallbackName: `${fallbackName}Item`
    })
  }

  override toString(): string {
    return applyModifiers(`List<${this.items}>`, this.modifiers)
  }
}
