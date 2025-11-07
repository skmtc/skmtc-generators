import {
  type TypeSystemValue,
  type GenerateContextType,
  type RefName,
  type ContentSettings,
  Identifier
} from '@skmtc/core'
import { toValibotValue } from './Valibot.ts'
import { ValibotBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
}

export class ValibotInsertable extends ValibotBase {
  value: TypeSystemValue
  constructor({ context, refName, settings, destinationPath, rootRef }: ConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, ValibotBase.id)

    this.value = toValibotValue({
      schema,
      required: true,
      destinationPath,
      context,
      rootRef
    })
  }

  static schemaToValueFn = (...args: Parameters<typeof toValibotValue>) => {
    return toValibotValue(...args)
  }

  static createIdentifier = Identifier.createVariable

  override toString() {
    return `${this.value}`
  }
}