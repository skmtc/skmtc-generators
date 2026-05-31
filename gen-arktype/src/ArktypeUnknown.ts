import type { OasRef, OasSchema } from '@skmtc/core'
import { SnippetBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeUnknownArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeUnknown extends SnippetBase {
  type = 'unknown' as const
  
  constructor({ context, generatorKey, destinationPath, schema }: ArktypeUnknownArgs) {
    super({ context, generatorKey, schema })
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("unknown")'
  }
}