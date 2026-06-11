import type { ModelProjectionConstructorArgs, SchemaToValueFn } from '@skmtc/core'
import { createDataClass, type KtAnnotation } from '@skmtc/lang-kotlin'
import { KtDataClassBase } from './base.ts'
import { KtDataClassValue } from './KtDataClassValue.ts'
import { toSealedMembership } from './sealedMembership.ts'
import type { ModelEnrichment } from './modelNames.ts'

/**
 * `components.schemas` object-with-properties → `data class`. The Driver
 * wraps this projection in a `KtDefinition` whose `data-class` kind it
 * read from `toIdentifier` (constant per class — see `base.ts`); the
 * class-level `@Serializable` rides the `KtAnnotated` protocol, delegated
 * to the value.
 */
export class KtDataClassProjection extends KtDataClassBase {
  value: KtDataClassValue

  constructor({ context, refName, settings, rootRef }: ModelProjectionConstructorArgs<ModelEnrichment>) {
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
      rootRef,
      sealedParents: toSealedMembership(context).get(refName) ?? []
    })
  }

  /** The `KtAnnotated` protocol — `KtDefinition` reads this off the Definition's value. */
  get annotations(): KtAnnotation[] {
    return this.value.annotations
  }

  /** The `KtDocumented` protocol, mirrored from the value (the Driver
   * wraps the PROJECTION — protocol fields must live on it). */
  get description(): string | undefined {
    return this.value.description
  }

  /** The `KtSupertyped` protocol — the claiming sealed parents' names,
   * rendered by `KtDefinition` as ` : Animal` after the parameter list.
   * Name-only by design: the parent's own transform visit generates its
   * Definition, and same-package suppression makes the bare name correct
   * (spec 22 §2.4). */
  get supertypes(): string[] {
    return this.value.supertypes
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
