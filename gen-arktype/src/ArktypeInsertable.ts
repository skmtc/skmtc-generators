import {
  type TypeSystemValue,
  type GenerateContextType,
  type RefName,
  type ContentSettings,
  Identifier
} from '@skmtc/core'
import { toArktypeValue } from './Arktype.ts'
import { ArktypeBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
}

export class ArktypeInsertable extends ArktypeBase {
  value: TypeSystemValue
  
  constructor({ context, refName, settings, destinationPath, rootRef }: ConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, ArktypeBase.id)

    this.value = toArktypeValue({
      schema,
      required: true,
      destinationPath,
      context,
      rootRef
    })
  }

  static schemaToValueFn = (...args: Parameters<typeof toArktypeValue>) => {
    return toArktypeValue(...args)
  }

  static createIdentifier = Identifier.createVariable

  override toString() {
    return `${this.value}`
  }
}