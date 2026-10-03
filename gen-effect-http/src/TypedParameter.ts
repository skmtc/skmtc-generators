import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type TypedParameterArgs = {
  context: GenerateContextType
  name: string
  /** The Effect schema whose decoded type the parameter carries. */
  schemaName: string
}

/** `params: typeof GetXParams.Type` — a parameter typed by its schema's own decoded type. */
export class TypedParameter extends SnippetBase {
  name: string
  schemaName: string

  constructor({ context, name, schemaName }: TypedParameterArgs) {
    super({ context })

    this.name = name
    this.schemaName = schemaName
  }

  override toString(): string {
    return `${this.name}: typeof ${this.schemaName}.Type`
  }
}
