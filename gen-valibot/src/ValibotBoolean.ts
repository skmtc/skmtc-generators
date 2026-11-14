import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasBoolean } from '@skmtc/core'

type ValibotBooleanArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  /** The boolean schema: its `enums`, and the node for fine-grained attribution. */
  schema?: OasBoolean
}

export class ValibotBoolean extends TsSnippet {
  type = 'boolean' as const
  modifiers: Modifiers
  enums: boolean[] | (boolean | null)[] | undefined

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: ValibotBooleanArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers
    this.enums = schema?.enums

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    // `enum: [true]` is the literal `true`, as gen-typescript types it; a
    // recursive model's `v.GenericSchema<T>` annotation checks this schema
    // against that type. `enum: [true, false]` says no more than a boolean.
    // A `null` among the values comes with `nullable`, which
    // `applyModifiers` renders, as in `toNumberEnum`.
    const values = this.enums?.filter((value): value is boolean => value !== null)

    const content =
      values === undefined || values.length > 1
        ? 'v.boolean()'
        : values.length === 0
          ? 'v.null()'
          : `v.literal(${values[0]})`

    return applyModifiers(content, this.modifiers)
  }
}
