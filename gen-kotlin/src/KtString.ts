import { createEnumClass, defineAndRegister, KtSnippet } from '@skmtc/lang-kotlin'
import type { GenerateContextType, GeneratorKey, Modifiers, OasString } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { getCustomScalar } from './scalars.ts'
import { KtEnumEntries } from './KtEnumEntries.ts'
import { toEnumValues } from './toEnumEntryName.ts'

type KtStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  generatorKey: GeneratorKey
  destinationPath: string
  /** Name for a synthesized enum class when the schema carries enums. */
  fallbackName: string
}

/**
 * String schema → Kotlin type. Plain strings map through the scalar map
 * (`String` for known formats, `ByteArray` for `binary`); a string with
 * enums synthesizes a named `enum class` sibling in the destination file
 * (Kotlin has no anonymous/inline enums) and references it by name —
 * the `findDefinition` + `defineAndRegister` sibling pattern, deduped by
 * `(fallbackName, destinationPath)`.
 */
export class KtString extends KtSnippet {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  private reference: string

  constructor({ context, stringSchema, modifiers, generatorKey, destinationPath, fallbackName }: KtStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.format = stringSchema.format
    this.enums = stringSchema.enums
    this.modifiers = modifiers

    const values = toEnumValues(stringSchema.enums)

    if (values.length > 0) {
      const existing = context.findDefinition({ name: fallbackName, exportPath: destinationPath })

      if (!existing) {
        defineAndRegister(context, {
          identifier: createEnumClass(fallbackName),
          value: new KtEnumEntries({
            context,
            values,
            destinationPath,
            stackTrail: stringSchema.stackTrail.clone()
          }),
          destinationPath
        })
      }

      this.reference = fallbackName
    } else {
      this.reference = getCustomScalar(this.format) ?? 'String'
    }
  }

  override toString(): string {
    return applyModifiers(this.reference, this.modifiers)
  }
}
