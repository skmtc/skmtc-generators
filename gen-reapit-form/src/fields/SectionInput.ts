import type { GenerateContextType, OasRef, OasSchema, Stringable } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { InputWrapper } from './InputWrapper.ts'

export type SectionInputArgs = {
  /** Originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  label: string
  children: Stringable[]
  destinationPath: string
}

/**
 * Wraps a nested-object's flattened children with a `<Subtitle>` heading.
 *
 * Without this, three address sections (`primaryAddress`,
 * `secondaryAddress`, `workAddress`) all flatten into the parent form
 * with identical leaf labels — three "Type" fields, three "Postcode"
 * fields, etc. — and a user can't tell which one belongs to which
 * address. The Subtitle disambiguates.
 *
 * The Subtitle itself is wrapped in `<InputWrapFull>` so it spans the
 * entire form-grid row; children are already InputWrap-wrapped by
 * `schemaToField` so they slot into the grid naturally.
 */
type SectionHeadingArgs = {
  context: GenerateContextType
  label: string
  destinationPath: string
}

/**
 * The `<Subtitle>` heading at the top of a section.
 *
 * A Snippet rather than an inline `{ toString }` literal: it carries context
 * and a generatorKey (so it is visible to attribution), is `instanceof
 * SnippetBase`, and owns the `Subtitle` import it needs instead of relying on
 * its parent to register it.
 */
class SectionHeading extends TsSnippet {
  readonly label: string

  constructor({ context, label, destinationPath }: SectionHeadingArgs) {
    super({ context })
    this.label = label

    this.register({
      destinationPath,
      imports: { '@reapit/elements': ['Subtitle'] }
    })
  }

  override toString(): string {
    return `<Subtitle hasMargin>${this.label}</Subtitle>`
  }
}

export class SectionInput extends TsSnippet {
  readonly label: string
  readonly children: Stringable[]
  private readonly headingWrap: InputWrapper

  constructor({ context, label, children, destinationPath, schema }: SectionInputArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })
    this.label = label
    this.children = children

    // Subtitle as a full-row item in the form grid. We construct the
    // wrapper here (not at render time) so its `register()` fires
    // during the Generate phase like every other Snippet's imports.
    this.headingWrap = new InputWrapper({
      context,
      destinationPath,
      size: 'full',
      child: new SectionHeading({ context, label, destinationPath })
    })
  }

  override toString(): string {
    return [
      this.headingWrap.toString(),
      ...this.children.map(c => c.toString())
    ].join('\n')
  }
}
