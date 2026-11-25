import type { ContentSettings, TypeSystemValue, GenerateContextType, RefParts } from '@skmtc/core'
import { createType } from '@skmtc/lang-typescript'
import { toTsValue } from './Ts.ts'
import { TypescriptBase } from './base.ts'
import { buildModel } from './intersectionMembers.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContextType
  ref: RefParts
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefParts
}

export class TsProjection extends TypescriptBase {
  value: TypeSystemValue
  constructor({ context, ref, settings, rootRef }: ConstructorArgs) {
    super({ context, ref, settings })

    const schema = context.resolveSchemaRefOnce(ref)

    this.value = buildModel(() =>
      toTsValue({
        schema,
        required: true,
        destinationPath: settings.exportPath,
        context,
        rootRef
      })
    )
  }

  static schemaToValueFn = (...args: Parameters<typeof toTsValue>) => {
    return toTsValue(...args)
  }

  static createIdentifier = createType

  override toString() {
    return `${this.value}`
  }
}
