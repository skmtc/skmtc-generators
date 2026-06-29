import type { ModelProjectionConstructorArgs, SchemaToValueFn } from '@skmtc/core'
import type { EnrichmentSchema } from './modelNames.ts'
import { createEnum, type CsAttribute } from '@skmtc/lang-csharp'
import { CsEnumBase } from './base.ts'
import { CsEnumMembers } from './CsEnumMembers.ts'
import { toEnumValues } from './toEnumValues.ts'

/**
 * `components.schemas` string-with-enums → `enum`. Members are
 * PascalCase with `[JsonStringEnumMemberName]` where the wire value
 * differs; the class-level
 * `[JsonConverter(typeof(JsonStringEnumConverter))]` rides the
 * `CsAttributed` protocol, MIRRORED from the value (the spec-28
 * gotcha), as does the XML-doc summary.
 */
export class CsEnumProjection extends CsEnumBase {
  value: CsEnumMembers

  constructor({ context, refName, settings }: ModelProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, CsEnumBase.id)

    if (schema.isRef() || schema.type !== 'string') {
      throw new Error(
        `@skmtc/gen-csharp: '${refName}' is not a string schema — ` +
          `CsEnumProjection is only reachable through the toCsProjection dispatch`
      )
    }

    const values = toEnumValues(schema.enums)

    if (values.length === 0) {
      throw new Error(
        `@skmtc/gen-csharp: '${refName}' has no enum values — ` +
          `CsEnumProjection is only reachable through the toCsProjection dispatch`
      )
    }

    this.value = new CsEnumMembers({
      context,
      values,
      typeName: settings.identifier.name,
      destinationPath: settings.exportPath,
      description: schema.description,
      stackTrail: schema.stackTrail.clone()
    })
  }

  /** The `CsAttributed` protocol — `CsDefinition` reads this off the Definition's value. */
  get attributes(): CsAttribute[] {
    return this.value.attributes
  }

  /** The `CsDocumented` protocol, mirrored from the value. */
  get description(): string | undefined {
    return this.value.description
  }

  /**
   * Inline (`insertNormalizedModel`) usage is not supported in v1;
   * inline string enums inside this generator's own traversal
   * synthesize via `CsString` instead.
   */
  static schemaToValueFn: SchemaToValueFn = () => {
    throw new Error(
      `@skmtc/gen-csharp: insertNormalizedModel against CsEnumProjection is not supported — ` +
        `insert by refName via insertModel`
    )
  }

  static createIdentifier = createEnum

  override toString(): string {
    return `${this.value}`
  }
}
