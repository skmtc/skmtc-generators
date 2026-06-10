import type {
  GeneratorKey,
  Modifiers,
  GenerateContextType,
  OasBoolean
} from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'

type TsBooleanArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  /**
   * The parsed boolean schema. Carries `enums` (the boolean values
   * the schema constrains to) so a single-value enum can be emitted
   * as the TS literal type `true` / `false` rather than the wider
   * `boolean`. Mirrors the same enum handling on `TsString` /
   * `TsInteger` — closes the boolean half of friction #17.
   */
  booleanSchema: OasBoolean
  generatorKey: GeneratorKey
}

export class TsBoolean extends TsSnippet {
  type = 'boolean' as const
  modifiers: Modifiers
  enums?: boolean[] | (boolean | null)[]

  constructor({ context, modifiers, booleanSchema, generatorKey }: TsBooleanArgs) {
    super({ context, generatorKey, stackTrail: booleanSchema.stackTrail.clone() })

    this.modifiers = modifiers
    this.enums = booleanSchema.enums
  }

  override toString(): string {
    const { enums } = this

    // `enum: [true]` → TS literal type `true`; `enum: [true, false]`
    // carries no extra info vs an unconstrained boolean. Multi-value
    // boolean enums fall through to plain `boolean` rather than
    // emitting `true | false` (functionally identical, but the wider
    // form reads cleaner).
    if (enums && enums.length === 1) {
      return applyModifiers(`${enums[0]}`, this.modifiers)
    }

    return applyModifiers(`boolean`, this.modifiers)
  }
}
