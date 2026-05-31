import {
  type GenerateContextType,
  SnippetBase,
  type GeneratorKey,
  type OasRef,
  type OasSchema
} from '@skmtc/core'

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

export class TsUnknown extends SnippetBase {
  type = 'unknown' as const

  constructor({ context, generatorKey, schema }: ConstructorArgs) {
    super({ context, generatorKey, schema })
  }

  override toString(): string {
    return 'unknown'
  }
}
