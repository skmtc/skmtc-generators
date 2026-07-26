import type { GenerateContextType, RefName, ContentSettings } from '@skmtc/core'
import { createVariable } from '@skmtc/lang-typescript'
import { type ArktypeValue, toArktypeValue } from './Arktype.ts'
import { ArktypeBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
}

export class ArktypeProjection extends ArktypeBase {
  value: ArktypeValue

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

    // The `type(…)` call is what turns a definition into a Type, so it belongs
    // here, once, at the top — values below compose as plain definitions.
    this.register({ imports: { arktype: ['type'] } })
  }

  static schemaToValueFn = (...args: Parameters<typeof toArktypeValue>): ArktypeValue => {
    return toArktypeValue(...args)
  }

  static createIdentifier = createVariable

  override toString(): string {
    return `type(${this.value})`
  }
}
