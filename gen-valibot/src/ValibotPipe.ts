import { type GenerateContextType, SnippetBase } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'

type ValibotActionArgs = {
  context: GenerateContextType
  /** The valibot action, without the `v.` prefix. */
  name: string
  /** Numbers render as-is; strings render verbatim (e.g. a `/regex/` literal). */
  value?: number | string
}

/** One `v.action(value)` of a pipe. */
export class ValibotAction extends SnippetBase {
  name: string
  value: number | string | undefined

  constructor({ context, name, value }: ValibotActionArgs) {
    super({ context })

    this.name = name
    this.value = value
  }

  override toString(): string {
    return `v.${this.name}(${this.value ?? ''})`
  }
}

type ValibotPipeArgs = {
  /** The schema the actions check, such as `v.string()`. */
  schema: string
}

/**
 * A schema and the actions that check it, rendered as `v.pipe(schema, a, b)`,
 * or the schema alone when there are none.
 */
export class ValibotPipe extends List<ValibotAction[]> {
  schema: string

  constructor({ schema }: ValibotPipeArgs) {
    super([], { separator: ', ' })

    this.schema = schema
  }

  override toString(): string {
    return this.values.length === 0 ? this.schema : `v.pipe(${this.schema}, ${super.toString()})`
  }
}
