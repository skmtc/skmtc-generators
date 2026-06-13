import { isEmpty } from '@skmtc/core'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasObject,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemRecord,
  TypeSystemValue
} from '@skmtc/core'
import { createDataClass, defineAndRegister, KtSnippet } from '@skmtc/lang-kotlin'
import { applyModifiers } from './applyModifiers.ts'
import { toKtValue } from './Kt.ts'
import { KtDataClassValue } from './KtDataClassValue.ts'

type KtObjectValueArgs = {
  context: GenerateContextType
  value: OasObject
  destinationPath: string
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
  /** Name for the synthesized data class when the object has properties. */
  fallbackName: string
}

/**
 * A NESTED (inline) object schema — Kotlin has no anonymous object types,
 * so the three shapes route to:
 *
 * - **has properties** → a synthesized named `data class` sibling in the
 *   destination file (`findDefinition` + `defineAndRegister`, deduped by
 *   `(fallbackName, destinationPath)`), referenced by name. When the
 *   object ALSO declares `additionalProperties`, the properties win and
 *   the additional-properties channel is dropped (documented v1 limit —
 *   Kotlin cannot model both in one type without a custom serializer).
 * - **only `additionalProperties`** → `Map<String, T>`.
 * - **empty** → `kotlinx.serialization.json.JsonObject`.
 *
 * Top-level object schemas never reach this class — `toKtProjection`
 * routes them before the value layer runs.
 */
export class KtObjectValue extends KtSnippet {
  type = 'object' as const
  recordProperties: KtRecord | null = null
  objectProperties: null = null
  modifiers: Modifiers
  private reference: string | KtRecord

  constructor({ context, value, destinationPath, modifiers, generatorKey, rootRef, fallbackName }: KtObjectValueArgs) {
    super({ context, generatorKey, stackTrail: value.stackTrail.clone() })

    this.modifiers = modifiers

    const { properties, additionalProperties } = value
    const hasProperties = properties && !isEmpty(properties)

    if (hasProperties) {
      const existing = context.findDefinition({ name: fallbackName, exportPath: destinationPath })

      if (!existing) {
        defineAndRegister(context, {
          identifier: createDataClass(fallbackName),
          value: new KtDataClassValue({
            context,
            objectSchema: value,
            destinationPath,
            className: fallbackName,
            rootRef
          }),
          destinationPath
        })
      }

      this.reference = fallbackName
    } else if (additionalProperties) {
      this.recordProperties = new KtRecord({
        context,
        generatorKey,
        destinationPath,
        schema: additionalProperties,
        rootRef,
        fallbackName
      })
      this.reference = this.recordProperties
    } else {
      this.register({
        imports: { 'kotlinx.serialization.json': ['JsonObject'] },
        destinationPath
      })
      this.reference = 'JsonObject'
    }
  }

  override toString(): string {
    return applyModifiers(`${this.reference}`, this.modifiers)
  }
}

type KtRecordArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  rootRef?: RefName
  fallbackName: string
}

/** `additionalProperties` → `Map<String, T>` (`JsonElement` for the open `true` form). */
export class KtRecord extends KtSnippet implements TypeSystemRecord {
  value: TypeSystemValue | 'true'
  private inner: string | TypeSystemValue

  constructor({ context, generatorKey, destinationPath, schema, rootRef, fallbackName }: KtRecordArgs) {
    super({ context, generatorKey })

    if (schema === true || isEmpty(schema)) {
      this.register({
        imports: { 'kotlinx.serialization.json': ['JsonElement'] },
        destinationPath
      })
      this.value = 'true'
      this.inner = 'JsonElement'
    } else {
      const inner = toKtValue({
        schema,
        destinationPath,
        required: true,
        context,
        rootRef,
        fallbackName: `${fallbackName}Value`
      })
      this.value = inner
      this.inner = inner
    }
  }

  override toString(): string {
    return `Map<String, ${this.inner}>`
  }
}
