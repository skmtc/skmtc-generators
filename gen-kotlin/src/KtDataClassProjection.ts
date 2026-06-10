import type { ModelProjectionConstructorArgs, SchemaToValueFn } from '@skmtc/core'
import { createDataClass, type KtAnnotation } from '@skmtc/lang-kotlin'
import { KtDataClassBase } from './base.ts'
import { KtDataClassValue } from './KtDataClassValue.ts'

/**
 * `components.schemas` object-with-properties → `data class`. The Driver
 * wraps this projection in a `KtDefinition` whose `data-class` kind it
 * read from `toIdentifier` (constant per class — see `base.ts`); the
 * class-level `@Serializable` rides the `KtAnnotated` protocol, delegated
 * to the value.
 */
export class KtDataClassProjection extends KtDataClassBase {
  value: KtDataClassValue

  constructor({ context, refName, settings, rootRef }: ModelProjectionConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, KtDataClassBase.id)

    if (schema.isRef() || schema.type !== 'object') {
      throw new Error(
        `@skmtc/gen-kotlin: '${refName}' is not an object schema — ` +
          `KtDataClassProjection is only reachable through the toKtProjection dispatch`
      )
    }

    this.value = new KtDataClassValue({
      context,
      objectSchema: schema,
      destinationPath: settings.exportPath,
      className: settings.identifier.name,
      rootRef
    })
  }

  /** The `KtAnnotated` protocol — `KtDefinition` reads this off the Definition's value. */
  get annotations(): KtAnnotation[] {
    return this.value.annotations
  }

  /**
   * Inline (`insertNormalizedModel`) usage is not supported in v1: the
   * engine's inline branch cannot thread the synthesized-name chain a
   * nested data class needs. Inline objects inside THIS generator's own
   * traversal synthesize via `KtObjectValue` instead.
   */
  static schemaToValueFn: SchemaToValueFn = () => {
    throw new Error(
      `@skmtc/gen-kotlin: insertNormalizedModel against KtDataClassProjection is not supported — ` +
        `insert by refName via insertModel`
    )
  }

  static createIdentifier = createDataClass

  override toString(): string {
    return `${this.value}`
  }
}
