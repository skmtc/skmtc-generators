import {
  type GenerateContextType,
  type GeneratorKey,
  type OasRef,
  type OasSchema
} from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type ConstructorArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  /**
   * The originating schema node — for fine-grained attribution. Optional:
   * `TsUnknown` may also be built internally with no originating node, in
   * which case the pointer is inherited.
   */
  schema?: OasSchema | OasRef<'schema'>
}

export class TsUnknown extends TsSnippet {
  type = 'unknown' as const

  constructor({ context, generatorKey, schema }: ConstructorArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })
  }

  override toString(): string {
    return 'unknown'
  }
}
