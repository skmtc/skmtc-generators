import { ContentBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

export type ArrayInputArgs = {
  context: GenerateContextType
  /** Lens path expressed as dotted property names, e.g. `officeIds`. */
  path: string
  label: string | undefined
  isRequired: boolean
  destinationPath: string
}

/**
 * Comma-separated text input for `[String!]!` / `[String]` arguments.
 *
 * The current Reapit GraphQL gateway accepts free-form IDs (officeIds,
 * negotiatorIds), so a closed-options multi-select is the wrong shape.
 * We emit `<ArrayStringField>` which the consumer implements once and
 * re-uses across forms; it's typed against `Lens<string[]>`.
 *
 * Future variants: an `ArrayInput` for [Int]/[Number] using a numeric
 * coercion field, or a referenced-entity combobox driven by a
 * generator-private enrichment (see skmtc-generator skill, "Generator-
 * private enrichments").
 */
export class ArrayInput extends ContentBase {
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean

  constructor({ context, path, label, isRequired, destinationPath }: ArrayInputArgs) {
    super({ context })
    this.path = path
    this.label = label
    this.isRequired = isRequired

    this.register({
      destinationPath,
      imports: { '@/forms/fields': ['ArrayStringField'] }
    })
  }

  override toString(): string {
    return `<ArrayStringField lens={lens.focus('${this.path}').defined()}${
      this.label ? ` label="${this.label}"` : ''
    } />`
  }
}
