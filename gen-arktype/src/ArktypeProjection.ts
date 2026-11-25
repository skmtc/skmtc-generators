import type { GenerateContextType, RefParts, ContentSettings } from '@skmtc/core'
import { createVariable } from '@skmtc/lang-typescript'
import { type ArktypeValue, toArktypeValue } from './Arktype.ts'
import { ArktypeIntersection } from './ArktypeIntersection.ts'
import { ArktypeBase } from './base.ts'
import { buildModel } from './intersectionMembers.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  ref: RefParts
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefParts
}

export class ArktypeProjection extends ArktypeBase {
  value: ArktypeValue
  isType: boolean

  constructor({ context, ref, settings, destinationPath, rootRef }: ConstructorArgs) {
    super({ context, ref, settings })

    const schema = context.resolveSchemaRefOnce(ref)

    this.value = buildModel(() =>
      toArktypeValue({
        schema,
        required: true,
        destinationPath,
        context,
        rootRef
      })
    )

    // An intersection is a Type already: `animal.and(…)`.
    this.isType = this.value instanceof ArktypeIntersection && this.value.isType

    // The `type(…)` call is what turns a definition into a Type, so it belongs
    // here, once, at the top — values below compose as plain definitions.
    if (!this.isType) {
      this.register({ imports: { arktype: ['type'] } })
    }
  }

  static schemaToValueFn = (...args: Parameters<typeof toArktypeValue>): ArktypeValue => {
    return toArktypeValue(...args)
  }

  static createIdentifier = createVariable

  override toString(): string {
    return this.isType ? `${this.value}` : `type(${this.value})`
  }
}
