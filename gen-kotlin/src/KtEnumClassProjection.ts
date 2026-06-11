import type { ModelProjectionConstructorArgs, SchemaToValueFn } from '@skmtc/core'
import { createEnumClass, type KtAnnotation } from '@skmtc/lang-kotlin'
import { KtEnumClassBase } from './base.ts'
import { KtEnumEntries } from './KtEnumEntries.ts'
import { toEnumValues } from './toEnumEntryName.ts'
import type { ModelEnrichment } from './modelNames.ts'

/**
 * `components.schemas` string-with-enums → `enum class`. Entries are
 * CONSTANT_CASE with `@SerialName` where the wire value differs; the
 * class-level `@Serializable` rides the `KtAnnotated` protocol.
 */
export class KtEnumClassProjection extends KtEnumClassBase {
  value: KtEnumEntries

  constructor({ context, refName, settings }: ModelProjectionConstructorArgs<ModelEnrichment>) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, KtEnumClassBase.id)

    if (schema.isRef() || schema.type !== 'string') {
      throw new Error(
        `@skmtc/gen-kotlin: '${refName}' is not a string schema — ` +
          `KtEnumClassProjection is only reachable through the toKtProjection dispatch`
      )
    }

    const values = toEnumValues(schema.enums)

    if (values.length === 0) {
      throw new Error(
        `@skmtc/gen-kotlin: '${refName}' has no enum values — ` +
          `KtEnumClassProjection is only reachable through the toKtProjection dispatch`
      )
    }

    this.value = new KtEnumEntries({
      context,
      values,
      destinationPath: settings.exportPath,
      stackTrail: schema.stackTrail.clone()
    })
  }

  /** The `KtAnnotated` protocol — `KtDefinition` reads this off the Definition's value. */
  get annotations(): KtAnnotation[] {
    return this.value.annotations
  }

  /**
   * Inline (`insertNormalizedModel`) usage is not supported in v1; inline
   * string enums inside this generator's own traversal synthesize via
   * `KtString` instead.
   */
  static schemaToValueFn: SchemaToValueFn = () => {
    throw new Error(
      `@skmtc/gen-kotlin: insertNormalizedModel against KtEnumClassProjection is not supported — ` +
        `insert by refName via insertModel`
    )
  }

  static createIdentifier = createEnumClass

  override toString(): string {
    return `${this.value}`
  }
}
