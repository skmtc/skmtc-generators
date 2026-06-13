import type { ModelProjectionConstructorArgs, SchemaToValueFn, Stringable } from '@skmtc/core'
import { createClass } from '@skmtc/lang-kotlin'
import { JacksonSModelBase } from '@/base.ts'
import { SdkModelValue } from '@/model/SdkModelValue.ts'
import { generatedFileHeader } from '@/generatedFileHeader.ts'
import type { SharedHashes } from '@/model/structuralHash.ts'

/**
 * THE standalone Jackson/Stainless model projection — one `class` per
 * `components.schemas` object entry. The constructor builds the
 * {@link SdkModelValue} engine (the JsonField data class with its
 * `@JsonCreator` constructor, typed/raw accessors, builder, validate
 * block, and nested inline classes); `toString()` renders it.
 *
 * The Driver wraps THIS projection as the `KtDefinition`'s value, so the
 * value-carried `KtConstructed` protocol (the primary-constructor
 * parameter list + modifiers the `class` shell needs) is MIRRORED here as
 * getters — `KtDefinition` reads them off the wrapper, not the inner value
 * (the spec-28 gotcha).
 *
 * Standalone use only — no shared-model substitution (`sharedHashes` is
 * empty) and no envelope conversion; those are SDK policy. Nested object
 * properties stay inline in the class body (the engine owns nesting), so
 * there is no per-nested `insertModel`.
 */
export class JacksonSModel extends JacksonSModelBase {
  value: SdkModelValue

  constructor({ context, refName, settings }: ModelProjectionConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, JacksonSModelBase.id)

    if (schema.isRef() || schema.type !== 'object') {
      throw new Error(
        `@skmtc/gen-kotlin-jackson-s: '${refName}' is not an object schema — ` +
          `JacksonSModel handles only object components (filter in the entry transform)`
      )
    }

    const sharedHashes: SharedHashes = new Map()

    this.value = new SdkModelValue({
      context,
      schema,
      className: settings.identifier.name,
      destinationPath: settings.exportPath,
      fileHeader: generatedFileHeader,
      sharedHashes,
      sorted: true
    })
  }

  /** The `KtConstructed` protocol — the primary-constructor parameter list,
   * mirrored from the value for `KtDefinition`'s `class` shell. */
  get constructorParameters(): Stringable {
    return this.value.constructorParameters
  }

  /** The `KtConstructed` protocol — the constructor modifiers
   * (`@JsonCreator(...) private`), mirrored from the value. */
  get constructorModifiers(): Stringable {
    return this.value.constructorModifiers
  }

  /**
   * Inline (`insertNormalizedModel`) usage is not supported — insert by
   * refName via `insertModel`. The SDK reaches the engine by
   * import-and-construct, not through this projection.
   */
  static schemaToValueFn: SchemaToValueFn = () => {
    throw new Error(
      `@skmtc/gen-kotlin-jackson-s: insertNormalizedModel against JacksonSModel is not supported — ` +
        `insert by refName via insertModel`
    )
  }

  static createIdentifier = createClass

  override toString(): string {
    return `${this.value}`
  }
}
