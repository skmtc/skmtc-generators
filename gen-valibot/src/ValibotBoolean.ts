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
    const content = this.enums?.length === 1 ? `v.literal(${this.enums[0]})` : 'v.boolean()'

    return applyModifiers(content, this.modifiers)
  }
}
