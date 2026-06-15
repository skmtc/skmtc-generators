import type { GenerateContextType, OasObject } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import type { AddField, ModelField } from '@/model/ModelField.ts'
import type { SharedHashes } from '@/model/structuralHash.ts'
import { orderSortedFields, shadowFields, toModelFields } from '@/model/toModelFields.ts'
import { ModelClassBody } from '@/model/sections/ModelClassBody.ts'
import { ModelField as ModelFieldClass } from '@/model/ModelField.ts'
import { PrimaryConstructorParameters } from '@/model/sections/PrimaryConstructorParameters.ts'

type Args = {
  context: GenerateContextType
  className: string
  schema: OasObject
  destinationPath: string
  sharedHashes: SharedHashes
  /** Enrichment `addFields` injections, merged at the sorted position. */
  extraFields?: AddField[]
}

/** A nested inline-schema class: the constructor walks the schema; `toString()` is the declaration shell + section set. */
export class NestedModelClass extends KtSnippet {
  className: string
  description: string | undefined
  fields: ModelField[]
  parameters: PrimaryConstructorParameters
  body: ModelClassBody

  constructor({ context, className, schema, destinationPath, sharedHashes, extraFields }: Args) {
    super({ context })
    this.className = className
    this.description = schema.description

    const walked = toModelFields({ context, schema, destinationPath, sharedHashes, sorted: true })

    // Config-injected fields merge at the sorted position (corpus:
    // the `limitExceeded` placements).
    this.fields = extraFields?.length
      ? orderSortedFields(
          [
            ...walked,
            ...extraFields.map(addField => new ModelFieldClass({ context, addField }))
          ],
          context
        )
      : walked

    this.parameters = new PrimaryConstructorParameters({
      context,
      fields: this.fields,
      destinationPath
    })
    this.body = new ModelClassBody({
      context,
      className,
      fields: this.fields,
      envelope: false,
      destinationPath
    })
  }

  /** Stdlib shadowing recursion — scope accumulates from the enclosing class. */
  applyShadowing(inherited: Set<string>): void {
    shadowFields(this.fields, inherited)
  }

  override toString(): string {
    const description = this.description ? `${kdoc([this.description])}\n` : ''

    return `${description}class ${this.className}
@JsonCreator(mode = JsonCreator.Mode.DISABLED)
private constructor(
${this.parameters}
) {
${indent(`${this.body}`, 1)}
}`
  }
}
