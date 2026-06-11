import type { ModelProjectionConstructorArgs, SchemaToValueFn } from '@skmtc/core'
import type { ModelEnrichment } from './modelNames.ts'
import { createRecord } from '@skmtc/lang-csharp'
import { CsRecordBase } from './base.ts'
import { CsRecordValue } from './CsRecordValue.ts'
import { toPolymorphicMembership } from './polymorphicMembership.ts'

/**
 * `components.schemas` object-with-properties → `record`. The Driver
 * wraps this projection in a `CsDefinition` whose `record` kind it read
 * from `toIdentifier` (constant per class — see `base.ts`); the XML-doc
 * summary rides the `CsDocumented` protocol and the polymorphic
 * base-type clause rides `CsBased`, both MIRRORED from the value (the
 * spec-28 gotcha: the Driver wraps the PROJECTION — protocol fields
 * must live on it).
 */
export class CsRecordProjection extends CsRecordBase {
  value: CsRecordValue

  constructor({ context, refName, settings, rootRef }: ModelProjectionConstructorArgs<ModelEnrichment>) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, CsRecordBase.id)

    if (schema.isRef() || schema.type !== 'object') {
      throw new Error(
        `@skmtc/gen-csharp: '${refName}' is not an object schema — ` +
          `CsRecordProjection is only reachable through the toCsProjection dispatch`
      )
    }

    this.value = new CsRecordValue({
      context,
      objectSchema: schema,
      destinationPath: settings.exportPath,
      className: settings.identifier.name,
      rootRef,
      polymorphicParents: toPolymorphicMembership(context).get(refName) ?? []
    })
  }

  /** The `CsDocumented` protocol, mirrored from the value. */
  get description(): string | undefined {
    return this.value.description
  }

  /** The `CsBased` protocol — the claiming polymorphic parents' names,
   * rendered by `CsDefinition` as ` : Animal` after the record name.
   * Name-only by design: the parent's own transform visit generates
   * its Definition, and same-namespace suppression makes the bare name
   * correct. */
  get baseTypes(): string[] {
    return this.value.baseTypes
  }

  /**
   * Inline (`insertNormalizedModel`) usage is not supported in v1: the
   * engine's inline branch cannot thread the synthesized-name chain a
   * nested record needs. Inline objects inside THIS generator's own
   * traversal synthesize via `CsObjectValue` instead.
   */
  static schemaToValueFn: SchemaToValueFn = () => {
    throw new Error(
      `@skmtc/gen-csharp: insertNormalizedModel against CsRecordProjection is not supported — ` +
        `insert by refName via insertModel`
    )
  }

  static createIdentifier = createRecord

  override toString(): string {
    return `${this.value}`
  }
}
