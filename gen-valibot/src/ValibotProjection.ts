import { isReferencedBack } from '@skmtc/core'
import type { TypeSystemValue, GenerateContextType, RefName, ContentSettings } from '@skmtc/core'
import { createVariable } from '@skmtc/lang-typescript'
import { TsProjection } from '@skmtc/gen-typescript'
import { toValibotValue } from './Valibot.ts'
import { ValibotBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { toVariantKeys } from './variant.ts'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
}

export class ValibotProjection extends ValibotBase {
  value: TypeSystemValue
  /** The value's `variantKeys` (see `isVariantOption`); none for a model typed `v.GenericSchema<T>`. */
  variantKeys: string[]
  constructor({ context, refName, settings, destinationPath, rootRef }: ConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName)

    this.value = toValibotValue({
      schema,
      required: true,
      destinationPath,
      context,
      rootRef
    })

    // Every reference inside a cycle renders `v.lazy(() => …)` (see
    // ValibotRef), so the `export const` of a model the cycle refers back to
    // depends on its own initializer, which TypeScript cannot type by
    // inference (TS7022 / TS7024). Every cycle passes through such a model,
    // so annotating it `v.GenericSchema<T>` breaks every one, with T
    // gen-typescript's type for the model, imported into this file unless
    // the two share it.
    const recursive = isReferencedBack({ context, settings })

    if (recursive) {
      const type = context.insertModel(TsProjection, refName, {
        variant: 'main',
        destinationPath
      })

      this.settings.identifier.typeName = `v.GenericSchema<${type.toName()}>`
    }

    this.variantKeys = recursive ? [] : toVariantKeys(this.value)
  }

  static schemaToValueFn = (...args: Parameters<typeof toValibotValue>) => {
    return toValibotValue(...args)
  }

  static createIdentifier = createVariable

  override toString() {
    return `${this.value}`
  }
}
