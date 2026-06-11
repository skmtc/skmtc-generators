import { CsSnippet } from '@skmtc/lang-csharp'
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
import { toCsValue } from './Cs.ts'

type CsArrayArgs = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  items: OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
  schema: OasArray
  fallbackName: string
  inliningTrail?: RefName[]
}

/** Array schema → `IReadOnlyList<T>` (D13; scratch-proof 3 — deserializes with zero converters). */
export class CsArray extends CsSnippet {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor({
    context,
    destinationPath,
    modifiers,
    items,
    generatorKey,
    rootRef,
    schema,
    fallbackName,
    inliningTrail
  }: CsArrayArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({
      imports: { 'System.Collections.Generic': ['IReadOnlyList'] },
      destinationPath
    })

    this.items = toCsValue({
      schema: items,
      destinationPath,
      required: true,
      context,
      rootRef,
      fallbackName: `${fallbackName}Item`,
      inliningTrail
    })
  }

  override toString(): string {
    return applyModifiers(`IReadOnlyList<${this.items}>`, this.modifiers)
  }
}
