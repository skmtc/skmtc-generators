import type { ModelProjectionConstructorArgs, SchemaToValueFn } from '@skmtc/core'
import { createSealedInterface, type KtAnnotation } from '@skmtc/lang-kotlin'
import { KtSealedInterfaceBase } from './base.ts'
import { KtSealedInterfaceValue } from './KtSealedInterfaceValue.ts'
import { KtDataClassProjection } from './KtDataClassProjection.ts'
import { isSealedUnion } from './sealedMembership.ts'
import type { ModelEnrichment } from './modelNames.ts'

/**
 * A qualifying discriminated union (`oneOf`) → `sealed interface`
 * (spec 22). The member side of the relationship — the ` : Animal`
 * clause, the `@SerialName` wire tag, the discriminator-property
 * omission — is rendered by `KtDataClassProjection` reading the
 * sealed-membership scan; THIS projection renders the parent: the bare
 * annotated interface, and inserts every member so the subtypes exist
 * even when nothing else references them (the Driver dedups; `KtFile`
 * suppresses the same-package imports, so in v1 the member files carry
 * no import of the parent and vice versa).
 */
export class KtSealedInterfaceProjection extends KtSealedInterfaceBase {
  value: KtSealedInterfaceValue

  constructor({ context, refName, settings }: ModelProjectionConstructorArgs<ModelEnrichment>) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, KtSealedInterfaceBase.id)

    if (schema.isRef() || schema.type !== 'union' || !isSealedUnion(context, schema)) {
      throw new Error(
        `@skmtc/gen-kotlin: '${refName}' is not a qualifying discriminated union — ` +
          `KtSealedInterfaceProjection is only reachable through the toKtProjection dispatch`
      )
    }

    schema.members.forEach(member => {
      if (member.isRef()) {
        context.insertModel(KtDataClassProjection, member.toRefName())
      }
    })

    this.value = new KtSealedInterfaceValue({
      context,
      unionSchema: schema,
      destinationPath: settings.exportPath
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

  /**
   * Inline (`insertNormalizedModel`) usage is not supported: an inline
   * union has no refName for the membership inversion, so it can never
   * be sealed (spec 22, decision 3) — inline unions stay `JsonElement`.
   */
  static schemaToValueFn: SchemaToValueFn = () => {
    throw new Error(
      `@skmtc/gen-kotlin: insertNormalizedModel against KtSealedInterfaceProjection is not supported — ` +
        `inline unions cannot be sealed; insert by refName via insertModel`
    )
  }

  static createIdentifier = createSealedInterface

  override toString(): string {
    return `${this.value}`
  }
}
