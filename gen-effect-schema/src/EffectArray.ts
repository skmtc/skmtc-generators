import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  OasArray,
  RefName,
  TypeSystemValue,
} from '@skmtc/core'
import { toEffectValueImpl } from './Effect.ts'
import {
  applyModifiers,
  type EffectModifiers,
  libImports,
} from './modifiers.ts'
import { EffectCheck, EffectChecks } from './EffectChecks.ts'
import { LIB, LIB_MODULE } from './lib.ts'

type EffectArrayArgs = {
  context: GenerateContextType
  destinationPath: string
  arraySchema: OasArray
  modifiers: EffectModifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
  coerce?: boolean
}

export class EffectArray extends TsSnippet {
  type = 'array' as const
  items: TypeSystemValue
  /** `minItems` / `maxItems` — Effect's length filters serve arrays too. */
  checks: EffectChecks
  modifiers: EffectModifiers
  /** Query-string mode — see `toString`. */
  coerce: boolean

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      arraySchema,
      modifiers,
      rootRef,
      coerce = false,
    }: EffectArrayArgs,
  ) {
    super({ context, generatorKey, stackTrail: arraySchema.stackTrail.clone() })

    this.modifiers = modifiers
    this.coerce = coerce
    this.checks = new EffectChecks()

    const { items, minItems, maxItems } = arraySchema

    if (minItems !== undefined) {
      this.checks.values.push(
        new EffectCheck({ context, name: 'isMinLength', value: minItems }),
      )
    }
    if (maxItems !== undefined) {
      this.checks.values.push(
        new EffectCheck({ context, name: 'isMaxLength', value: maxItems }),
      )
    }

    // The items value is built by recursing through the router — a
    // snippet, never a string. This is what keeps nested refs cached.
    this.items = toEffectValueImpl({
      destinationPath,
      schema: items,
      required: true,
      context,
      rootRef,
      coerce,
    })

    this.register({
      imports: { [LIB_MODULE]: libImports(modifiers) },
      destinationPath,
    })
  }

  override toString(): string {
    // Mutable, as gen-typescript types the same array: the two are one
    // document's types and code written against one must take the other.
    // (`mutable` takes no encoding on the array node, so the query-string
    // form below stays readonly — a query is read, never grown.)
    //
    // Off a query string a key seen once arrives as a lone value and a key
    // seen twice as a list; `?variants=thumb` is a list of one to the
    // contract, so a lone value is taken as one before the length checks.
    const array = this.coerce
      ? `${LIB}.ArrayEnsure(${this.items})`
      : `${LIB}.mutable(${LIB}.Array(${this.items}))`

    return applyModifiers(`${array}${this.checks}`, this.modifiers)
  }
}
