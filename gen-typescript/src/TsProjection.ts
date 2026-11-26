import type { ContentSettings, TypeSystemValue, GenerateContextType, RefParts } from '@skmtc/core'
import { createType } from '@skmtc/lang-typescript'
import { toTsValue } from './Ts.ts'
import { TypescriptBase } from './base.ts'
import { toDirectNames } from './directNames.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContextType
  ref: RefParts
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefParts
}

export class TsProjection extends TypescriptBase {
  value: TypeSystemValue
  /** See `toDirectNames`. */
  directNames: string[]
  constructor({ context, ref, settings, rootRef }: ConstructorArgs) {
    super({ context, ref, settings })

    const schema = context.resolveSchemaRefOnce(ref)

    this.value = toTsValue({
      schema,
      required: true,
      destinationPath: settings.exportPath,
      context,
      rootRef
    })

    this.directNames = toDirectNames(this.value)

    // `Card: { allOf: [Payment, …] }` with `Payment: { oneOf: [Card, …] }`:
    // TypeScript refuses the alias (TS2456), and a validator written from
    // it never ends its parse.
    if (this.directNames.includes(settings.identifier.name)) {
      throw new Error(
        `${schema.stackTrail.toSchemaPointer()} cannot be rendered: ${settings.identifier.name} is a member of its own allOf, oneOf or anyOf, with no property between. A type alias cannot refer to itself that way.`
      )
    }
  }

  static schemaToValueFn = (...args: Parameters<typeof toTsValue>) => {
    return toTsValue(...args)
  }

  static createIdentifier = createType

  override toString() {
    return `${this.value}`
  }
}
