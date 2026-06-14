import { capitalize, camelCase } from '@skmtc/core'
import type {
  ModelProjectionConstructorArgs,
  SchemaToValueFn,
  TypeSystemValue
} from '@skmtc/core'
import {
  createTypeAlias,
  isKtAnnotated,
  isKtDocumented,
  isKtSupertyped,
  type KtAnnotation
} from '@skmtc/lang-kotlin'
import { KtModelBase } from './base.ts'
import { toKtModelShape } from './toKtModelShape.ts'
import { KtDataClassValue } from './KtDataClassValue.ts'
import { KtEnumEntries } from './KtEnumEntries.ts'
import { KtSealedInterfaceValue } from './KtSealedInterfaceValue.ts'
import { toKtValue } from './Kt.ts'
import { toSealedMembership } from './sealedMembership.ts'
import { toEnumValues } from './toEnumEntryName.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ModelValue = KtDataClassValue | KtEnumEntries | KtSealedInterfaceValue | TypeSystemValue

/**
 * THE gen-kotlin model projection — one class for every `components.schemas`
 * entry. Now that `toIdentifierType` is context-aware (it picks the
 * declaration kind from the schema via {@link toKtModelShape}), a single
 * projection covers all four Kotlin shapes; the constructor reads the SAME
 * shape source to build the matching value, so kind and value never
 * disagree. This folds the old four per-kind projections + the
 * `toKtProjection` class dispatch into one.
 *
 * The Driver wraps this projection AS the `KtDefinition`'s value, so the
 * value-carried protocols (`@Serializable` annotations, the sealed-parent
 * supertype clause, the KDoc description) must be MIRRORED here as getters
 * — `KtDefinition` reads them off the wrapper, not the inner value (the
 * spec-28 gotcha). Each getter delegates to the inner value through the
 * `is*` guards, so a shape that lacks a protocol renders nothing (an empty
 * annotation/supertype list and an undefined description all render
 * identically to absence in `KtDefinition`).
 */
export class KtModelProjection extends KtModelBase {
  value: ModelValue

  constructor({ context, refName, settings, rootRef }: ModelProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, KtModelBase.id)
    const shape = toKtModelShape(context, schema)

    if (shape === 'data-class' && !schema.isRef() && schema.type === 'object') {
      this.value = new KtDataClassValue({
        context,
        objectSchema: schema,
        destinationPath: settings.exportPath,
        className: settings.identifier.name,
        rootRef,
        sealedParents: toSealedMembership(context).get(refName) ?? []
      })
    } else if (shape === 'enum-class' && !schema.isRef() && schema.type === 'string') {
      this.value = new KtEnumEntries({
        context,
        values: toEnumValues(schema.enums),
        destinationPath: settings.exportPath,
        stackTrail: schema.stackTrail.clone()
      })
    } else if (shape === 'sealed-interface' && !schema.isRef() && schema.type === 'union') {
      // Insert every member so the subtypes exist even when nothing else
      // references them; the member side (the ` : Parent` clause, the
      // `@SerialName` tag, the discriminator omission) is rendered by the
      // member's own data-class projection reading the sealed-membership scan.
      schema.members.forEach(member => {
        if (member.isRef()) {
          context.insertModel(KtModelProjection, member.toRefName())
        }
      })

      this.value = new KtSealedInterfaceValue({
        context,
        unionSchema: schema,
        destinationPath: settings.exportPath
      })
    } else {
      // `typealias` catch-all: primitives, arrays, maps, empty objects,
      // unions-as-`JsonElement`, refs-to-refs.
      this.value = toKtValue({
        schema,
        destinationPath: settings.exportPath,
        required: true,
        context,
        rootRef,
        fallbackName: settings.identifier.name
      })
    }
  }

  /** The `KtAnnotated` protocol — mirrored from the value (the Driver wraps
   * the PROJECTION). Empty when the shape carries no class-level annotation. */
  get annotations(): KtAnnotation[] {
    return isKtAnnotated(this.value) ? this.value.annotations : []
  }

  /** The `KtDocumented` protocol — the KDoc summary, when the shape has one. */
  get description(): string | undefined {
    return isKtDocumented(this.value) ? this.value.description : undefined
  }

  /** The `KtSupertyped` protocol — the claiming sealed parents' names,
   * rendered by `KtDefinition` as ` : Animal` after the data-class
   * parameter list. Empty for non-member shapes. */
  get supertypes(): string[] {
    return isKtSupertyped(this.value) ? this.value.supertypes : []
  }

  /**
   * Inline (`insertNormalizedModel`) usage builds a typealias-style value
   * expression — gen-kotlin's own traversal never reaches this (it inserts
   * by refName via `insertModel`); it is here for external consumers
   * normalizing an inline schema against this projection.
   */
  static schemaToValueFn: SchemaToValueFn = ({ context, schema, destinationPath, required, rootRef }) => {
    return toKtValue({
      schema,
      destinationPath,
      required,
      context,
      rootRef,
      fallbackName: rootRef ? capitalize(camelCase(rootRef)) : 'Inline'
    })
  }

  static createIdentifier = createTypeAlias

  override toString(): string {
    return `${this.value}`
  }
}
