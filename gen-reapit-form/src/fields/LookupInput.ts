import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import { labelText } from './labelText.ts'

export type LookupInputArgs = {
  context: GenerateContextType
  /** The variable name of the dispatched lookup component (e.g. `OfficesMultiLookupField`). */
  componentName: string
  /** Lens path expressed as dotted property names, e.g. `officeIds`. */
  path: string
  label: string | undefined
  isRequired: boolean
}

/**
 * Renders a reference-backed multi-select field. The component itself
 * (e.g. `<OfficesMultiLookupField>`) is emitted by a sibling generator
 * (gen-reapit-searchable-dropdown) and the import is registered on this
 * file by the Driver during `context.insertOperation` — so no
 * `register()` call is needed here.
 */
export class LookupInput extends SnippetBase {
  readonly componentName: string
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean

  constructor({ context, componentName, path, label, isRequired }: LookupInputArgs) {
    super({ context })
    this.componentName = componentName
    this.path = path
    this.label = label
    this.isRequired = isRequired
  }

  override toString(): string {
    const label = labelText(this.label, this.isRequired)
    return `<${this.componentName} lens={lens.focus('${this.path}').defined()}${
      label ? ` label="${label}"` : ''
    } />`
  }
}
