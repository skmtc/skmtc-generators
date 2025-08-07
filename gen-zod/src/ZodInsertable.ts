import {
  type TypeSystemValue,
  type GenerateContext,
  type RefName,
  type ContentSettings,
  Identifier
} from '@skmtc/core'
import { toZodValue } from './Zod.ts'
import { ZodBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContext
  destinationPath: string
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
}

export class ZodInsertable extends ZodBase {
  value: TypeSystemValue
  constructor({ context, refName, settings, destinationPath, rootRef }: ConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, ZodBase.id)

    this.value = ZodInsertable.schemaToValueFn({
      schema,
      required: true,
      destinationPath,
      context,
      rootRef
    })
  }

  static schemaToValueFn = toZodValue

  static createIdentifier = Identifier.createVariable

  override toString() {
    return `${this.value}`
  }
}
