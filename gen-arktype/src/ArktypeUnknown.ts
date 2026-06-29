import type { OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeUnknownArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeUnknown extends TsSnippet {
  type = 'unknown' as const
  
  constructor({ context, generatorKey, destinationPath, schema }: ArktypeUnknownArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })
    this.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("unknown")'
  }
}