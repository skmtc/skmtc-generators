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
import { createRecord, defineAndRegister, CsSnippet } from '@skmtc/lang-csharp'
import { applyModifiers } from './applyModifiers.ts'
import { toCsModelExportPath } from './base.ts'
import { toCsValue } from './Cs.ts'
import { CsRecordValue } from './CsRecordValue.ts'

type CsObjectValueArgs = {
  context: GenerateContextType
  value: OasObject
  destinationPath: string
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
  /** Name for the synthesized record when the object has properties. */
  fallbackName: string
  inliningTrail?: RefName[]
}

/**
 * A NESTED (inline) object schema — C# has no anonymous object types, so
 * the three shapes route to:
 *
 * - **has properties** → a synthesized named `record` in its OWN
 *   canonical file (`toCsModelExportPath(fallbackName)` — one type per
 *   file, the .NET convention; deduped GLOBALLY by `findDefinition` at
 *   that path so the same construct reached from several files — the D6
 *   inlining case — synthesizes once), referenced by name (bare under
 *   same-namespace suppression). A deliberate divergence from
 *   gen-kotlin's same-file siblings: two C# files in one namespace
 *   cannot both declare the synthesized type. A `findDefinition` hit
 *   with the wrong value type THROWS (note-30 lesson 4). When the
 *   object ALSO declares `additionalProperties`, the synthesized record
 *   carries the `[JsonExtensionData]` member (D16).
 * - **only `additionalProperties`** → `IReadOnlyDictionary<string, T>`
 *   (D13).
 * - **empty** → `System.Text.Json.Nodes.JsonObject` (D13).
 *
 * Top-level object schemas never reach this class — `toCsProjection`
 * routes them before the value layer runs.
 */
export class CsObjectValue extends CsSnippet {
  type = 'object' as const
  recordProperties: CsDictionary | null = null
  objectProperties: null = null
  modifiers: Modifiers
  private reference: string | CsDictionary

  constructor({
    context,
    value,
    destinationPath,
    modifiers,
    generatorKey,
    rootRef,
    fallbackName,
    inliningTrail
  }: CsObjectValueArgs) {
    super({ context, generatorKey, stackTrail: value.stackTrail.clone() })

    this.modifiers = modifiers

    const { properties, additionalProperties } = value
    const hasProperties = properties && !isEmpty(properties)

    if (hasProperties) {
      const exportPath = toCsModelExportPath(fallbackName)
      const existing = context.findDefinition({ name: fallbackName, exportPath })

      if (existing && !(existing.value instanceof CsRecordValue)) {
        throw new Error(
          `@skmtc/gen-csharp: found a definition named '${fallbackName}' at '${exportPath}' ` +
            `that is not a synthesized record — name collision, or two copies of the ` +
            `generator module are loaded`
        )
      }

      if (!existing) {
        defineAndRegister(context, {
          identifier: createRecord(fallbackName),
          value: new CsRecordValue({
            context,
            objectSchema: value,
            destinationPath: exportPath,
            className: fallbackName,
            rootRef,
            inliningTrail
          }),
          destinationPath: exportPath
        })
      }

      this.register({
        imports: { [exportPath]: [fallbackName] },
        destinationPath
      })

      this.reference = fallbackName
    } else if (additionalProperties) {
      this.recordProperties = new CsDictionary({
        context,
        generatorKey,
        destinationPath,
        schema: additionalProperties,
        rootRef,
        fallbackName,
        inliningTrail
      })
      this.reference = this.recordProperties
    } else {
      this.register({
        imports: { 'System.Text.Json.Nodes': ['JsonObject'] },
        destinationPath
      })
      this.reference = 'JsonObject'
    }
  }

  override toString(): string {
    return applyModifiers(`${this.reference}`, this.modifiers)
  }
}

type CsDictionaryArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  rootRef?: RefName
  fallbackName: string
  inliningTrail?: RefName[]
}

/** `additionalProperties` → `IReadOnlyDictionary<string, T>` (`JsonElement` for the open `true` form). */
export class CsDictionary extends CsSnippet implements TypeSystemRecord {
  value: TypeSystemValue | 'true'
  private inner: string | TypeSystemValue

  constructor({
    context,
    generatorKey,
    destinationPath,
    schema,
    rootRef,
    fallbackName,
    inliningTrail
  }: CsDictionaryArgs) {
    super({ context, generatorKey })

    this.register({
      imports: { 'System.Collections.Generic': ['IReadOnlyDictionary'] },
      destinationPath
    })

    if (schema === true || isEmpty(schema)) {
      this.register({
        imports: { 'System.Text.Json': ['JsonElement'] },
        destinationPath
      })
      this.value = 'true'
      this.inner = 'JsonElement'
    } else {
      const inner = toCsValue({
        schema,
        destinationPath,
        required: true,
        context,
        rootRef,
        fallbackName: `${fallbackName}Value`,
        inliningTrail
      })
      this.value = inner
      this.inner = inner
    }
  }

  override toString(): string {
    return `IReadOnlyDictionary<string, ${this.inner}>`
  }
}
