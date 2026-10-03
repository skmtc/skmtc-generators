import { type GenerateContextType, SnippetBase } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { LIB } from './lib.ts'

type EffectCheckArgs = {
  context: GenerateContextType
  /** The `Schema.is…` filter, without the prefix. */
  name: string
  /** Numbers render as-is; strings render verbatim (e.g. a `/regex/` literal). */
  value: number | string
}

/** One `Schema.isX(value)` filter. */
export class EffectCheck extends SnippetBase {
  name: string
  value: number | string

  constructor({ context, name, value }: EffectCheckArgs) {
    super({ context })

    this.name = name
    this.value = value
  }

  override toString(): string {
    return `${LIB}.${this.name}(${this.value})`
  }
}

/**
 * The filters a schema carries, rendered as one `.check(a, b)` call, or
 * nothing when there are none. Every constrained leaf (string, number,
 * integer, array) owns one of these.
 */
export class EffectChecks extends List<EffectCheck[]> {
  constructor() {
    super([], { separator: ', ' })
  }

  override toString(): string {
    return this.values.length === 0 ? '' : `.check(${super.toString()})`
  }
}
