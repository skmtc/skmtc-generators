import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { toNumberEnum } from './numberEnum.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasNumber } from '@skmtc/core'

type ValibotNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  /** The number schema: its `enums`, and the node for fine-grained attribution. */
  schema?: OasNumber
}

export class ValibotNumber extends TsSnippet {
  type = 'number' as const
  modifiers: Modifiers
  enums: number[] | (number | null)[] | undefined

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: ValibotNumberArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers
    this.enums = schema?.enums

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const content = this.enums ? toNumberEnum(this.enums) : 'v.number()'

    return applyModifiers(content, this.modifiers)
  }
}
