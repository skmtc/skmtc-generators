import type {
  ContentSettings,
  GenerateContextType,
  RefName,
  TypeSystemValue,
} from '@skmtc/core'
import { createVariable, toTsIdentifier } from '@skmtc/lang-typescript'
import { toEffectValue, toEffectValueImpl } from './Effect.ts'
import { BARREL_PATH, EffectBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import type { EffectSchemaOptions } from './options.ts'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
  /** The caller's options — the coerced reading, or none for JSON. */
  options?: EffectSchemaOptions
}

export class EffectProjection extends EffectBase {
  value: TypeSystemValue

  constructor(
    { context, refName, settings, destinationPath, rootRef, options }:
      ConstructorArgs,
  ) {
    super({ context, refName, settings, options })

    const schema = context.resolveSchemaRefOnce(refName, EffectBase.id)

    // The coerced reading is asked for by the caller (see options.ts); the
    // router threads it to every leaf, and a ref on the way passes it on.
    const coerce = this.options?.coerce ?? false

    this.value = toEffectValueImpl({
      schema,
      required: true,
      destinationPath,
      context,
      rootRef,
      coerce,
    })

    // A recursive schema needs no annotation on the export: Effect's
    // idiom types the `Schema.suspend` callback instead (see EffectRef),
    // which leaves the exported schema fully typed.

    // Every schema re-exports itself into one barrel beside it. Registered
    // here rather than in the entry so a schema reached only through a
    // peer (a component an endpoint references, a normalized response, a
    // coerced twin) is in the barrel too — a project scoped with `include`
    // may never run the entry for it.
    this.registerInto(
      BARREL_PATH,
      {
        reExports: {
          [settings.exportPath]: [toTsIdentifier(settings.identifier)],
        },
      },
    )
  }

  // These two statics make the projection consumable by PEER generators
  // via insertNormalizedModel — keep them. Core's inline branch passes no
  // options, so `coerce` is off here whatever the call said (options.ts).
  static schemaToValueFn = (...args: Parameters<typeof toEffectValue>) => {
    return toEffectValue(...args)
  }

  static createIdentifier = createVariable

  override toString(): string {
    return `${this.value}`
  }
}
