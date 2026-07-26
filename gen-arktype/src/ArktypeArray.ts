import type { OasRef, OasSchema } from '@skmtc/core'
import type { GenerateContextType, Modifiers, GeneratorKey, RefName } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers, applyValueModifiers } from './applyModifiers.ts'
import { toAtomicSyntax } from './toAtomicSyntax.ts'
import { type ArktypeValue, toArktypeValue } from './Arktype.ts'

type ArktypeArrayArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  modifiers: Modifiers
  items: OasSchema | OasRef<'schema'>
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeArray extends TsSnippet {
  type = 'array' as const
  items: ArktypeValue
  modifiers: Modifiers
  stringSyntax: string | undefined
  atomicStringSyntax: string | undefined

  constructor({
    context,
    items,
    modifiers,
    destinationPath,
    generatorKey,
    rootRef,
    schema
  }: ArktypeArrayArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    this.items = toArktypeValue({
      schema: items,
      required: true,
      destinationPath,
      context,
      rootRef
    })

    // An array is spellable in string syntax only when its item type is — an
    // object or a ref item forces the tuple form.
    const itemSyntax = this.items.atomicStringSyntax

    this.stringSyntax =
      itemSyntax === undefined ? undefined : applyModifiers(`${itemSyntax}[]`, modifiers)

    this.atomicStringSyntax =
      this.stringSyntax === undefined ? undefined : toAtomicSyntax(this.stringSyntax)
  }

  override toString(): string {
    return this.stringSyntax === undefined
      ? applyValueModifiers(`[${this.items}, "[]"]`, this.modifiers)
      : `"${this.stringSyntax}"`
  }
}
