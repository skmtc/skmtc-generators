import type { ModelProjectionConstructorArgs, SchemaToValueFn } from '@skmtc/core'
import type { EnrichmentSchema } from './modelNames.ts'
import { createAbstractRecord, type CsAttribute } from '@skmtc/lang-csharp'
import { CsAbstractRecordBase } from './base.ts'
import { CsPolymorphicParentValue } from './CsPolymorphicParentValue.ts'
import { CsRecordProjection } from './CsRecordProjection.ts'
import { isPolymorphicUnion } from './polymorphicMembership.ts'

/**
 * A qualifying discriminated union (`oneOf`) → `abstract partial
 * record` parent (CS-B / D14). The member side of the relationship —
 * the ` : Animal` clause and the discriminator-property omission — is
 * rendered by `CsRecordProjection` reading the polymorphic-membership
 * scan; THIS projection renders the parent: the bodyless record with
 * the parent-side `[JsonPolymorphic]`/`[JsonDerivedType]` attributes,
 * and inserts every member so the subtypes exist even when nothing
 * else references them (the Driver dedups; `CsFile` suppresses the
 * same-namespace usings, so in v1 the member files carry no using of
 * the parent and vice versa).
 */
export class CsAbstractRecordProjection extends CsAbstractRecordBase {
  value: CsPolymorphicParentValue

  constructor({ context, refName, settings }: ModelProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, CsAbstractRecordBase.id)

    if (schema.isRef() || schema.type !== 'union' || !isPolymorphicUnion(context, schema)) {
      throw new Error(
        `@skmtc/gen-csharp: '${refName}' is not a qualifying discriminated union — ` +
          `CsAbstractRecordProjection is only reachable through the toCsProjection dispatch`
      )
    }

    schema.members.forEach(member => {
      if (member.isRef()) {
        context.insertModel(CsRecordProjection, member.toRefName())
      }
    })

    this.value = new CsPolymorphicParentValue({
      context,
      unionSchema: schema,
      destinationPath: settings.exportPath
    })
  }

  /** The `CsAttributed` protocol — `CsDefinition` reads this off the Definition's value. */
  get attributes(): CsAttribute[] {
    return this.value.attributes
  }

  /** The `CsDocumented` protocol, mirrored from the value (the Driver
   * wraps the PROJECTION — protocol fields must live on it). */
  get description(): string | undefined {
    return this.value.description
  }

  /**
   * Inline (`insertNormalizedModel`) usage is not supported: an inline
   * union has no refName for the membership inversion, so it can never
   * become a polymorphic parent — inline unions stay `JsonElement`
   * until CS-D's union hints (the Kotlin decision-3 port).
   */
  static schemaToValueFn: SchemaToValueFn = () => {
    throw new Error(
      `@skmtc/gen-csharp: insertNormalizedModel against CsAbstractRecordProjection is not supported — ` +
        `inline unions cannot be polymorphic; insert by refName via insertModel`
    )
  }

  static createIdentifier = createAbstractRecord

  override toString(): string {
    return `${this.value}`
  }
}
