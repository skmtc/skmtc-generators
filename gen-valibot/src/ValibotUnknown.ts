import { TypescriptSnippet } from '@skmtc/lang-typescript'
import type {
  GeneratorKey,
  GenerateContextType,
  OasRef,
  OasSchema
} from '@skmtc/core'

type ValibotUnknownArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
  /**
   * The originating schema node — for fine-grained attribution. Optional:
   * `ValibotUnknown` may also be built internally with no originating node.
   */
  schema?: OasSchema | OasRef<'schema'>
}

export class ValibotUnknown extends TypescriptSnippet {
  type = 'unknown' as const

  constructor({ context, generatorKey, destinationPath, schema }: ValibotUnknownArgs) {
    super({ context, generatorKey, schema })

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    return 'v.unknown()'
  }
}
