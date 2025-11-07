import type { ContentSettings, TypeSystemValue, GenerateContextType, RefName } from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { TypescriptBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { Identifier } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
}

export class TsInsertable extends TypescriptBase {
  value: TypeSystemValue
  constructor({ context, refName, settings, rootRef }: ConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, TypescriptBase.id)

    this.value = toTsValue({
      schema,
      required: true,
      destinationPath: settings.exportPath,
      context,
      rootRef
    })
  }

  static schemaToValueFn = (...args: Parameters<typeof toTsValue>) => {
    return toTsValue(...args)
  }

  static createIdentifier = Identifier.createType

  override toString() {
    return `${this.value}`
  }
}
