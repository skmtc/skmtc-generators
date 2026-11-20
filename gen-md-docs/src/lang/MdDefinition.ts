import { DefinitionBase, type GeneratedValue } from '@skmtc/core'

/**
 * A Markdown definition: only its value. Markdown has no declaration that
 * names a value or assigns it, so the identifier only keys the definition in
 * its file, where the first one written wins.
 */
export class MdDefinition<V extends GeneratedValue = GeneratedValue> extends DefinitionBase<V> {
  override toString(): string {
    return `${this.value}`
  }
}
