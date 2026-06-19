import type { GenerateContextType, ModuleExport, OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type CustomInputArgs = {
  context: GenerateContextType
  name: string
  destinationPath: string
  /** The consumer-assigned input component (`{ exportName, exportPath }`), from
   *  the field's `input` enrichment. */
  input: ModuleExport
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

/**
 * Renders a consumer-assigned input component for a form field. Unlike the
 * built-in field snippets (StringInput, …), the component is named by the
 * `input` enrichment, so the only prop we can rely on is `lens` (the prop the
 * hub's type-matcher verified accepts the field's type). We deliberately do NOT
 * emit `label` here — a custom component isn't guaranteed to accept it; that
 * would be an excess-prop type error in the generated output.
 */
export class CustomInput extends TsSnippet {
  name: string
  exportName: string
  constructor({ context, name, destinationPath, input, schema }: CustomInputArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.name = name
    this.exportName = input.exportName

    this.register({
      imports: { [input.exportPath]: [input.exportName] },
      destinationPath
    })
  }

  override toString() {
    return `<${this.exportName}
      ${this.name ? `lens={lens.focus(\`${this.name}\`).defined()}` : 'lens={lens}'}
    />`
  }
}
