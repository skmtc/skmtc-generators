import { KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasRef,
  OasSchema,
  TypeSystemValue,
} from '@skmtc/core'
import { toKotlinValue } from './Kotlin.ts'
import { applyModifiers } from './modifiers.ts'

type KotlinArrayArgs = {
  context: GenerateContextType
  destinationPath: string
  items: OasSchema | OasRef<'schema'>
  /** The originating array schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class KotlinArray extends KtSnippet {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      items,
      modifiers,
      schema,
    }: KotlinArrayArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    // The items value is built by recursing through the router — a
    // snippet, never a string. This is what keeps nested refs cached.
    // `required: true` because a JSON array's members are never "absent";
    // only an explicitly nullable item schema makes the element type
    // nullable, and that arrives on the item's own node.
    this.items = toKotlinValue({
      destinationPath,
      schema: items,
      required: true,
      context,
    })
  }

  override toString(): string {
    // SLOT(array): `kotlin.collections.List` needs no import.
    return applyModifiers(`List<${this.items}>`, this.modifiers)
  }
}
