import { createEnumClass, defineAndRegister, KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasString,
} from '@skmtc/core'
import { applyModifiers } from './modifiers.ts'
import { KotlinEnumEntries } from './KotlinEnumEntries.ts'
import { toSynthesizedName } from './toSynthesizedName.ts'

type KotlinStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class KotlinString extends KtSnippet {
  type = 'string' as const
  stringSchema: OasString
  // format + enums are part of the TypeSystemString contract peers rely on.
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers

  /** The synthesized enum class's name, when enum members forced one. */
  private reference: string | null = null

  constructor(
    { context, stringSchema, generatorKey, modifiers, destinationPath }: KotlinStringArgs,
  ) {
    super({
      context,
      generatorKey,
      stackTrail: stringSchema.stackTrail.clone(),
    })

    this.stringSchema = stringSchema
    this.format = stringSchema.format
    this.enums = stringSchema.enums
    this.modifiers = modifiers

    // Kotlin has no anonymous enum type — an INLINE string enum is
    // synthesized as a named sibling `enum class` and referenced by name,
    // exactly like an inline object (the name derives from the schema's
    // stackTrail). A `null` member is the nullable-enum idiom, a fact
    // about the property, not an entry — KotlinEnumEntries filters it.
    const entries = (stringSchema.enums ?? []).filter((value) => value !== null)

    if (entries.length > 0) {
      const name = toSynthesizedName(stringSchema.stackTrail)

      const existing = context.findDefinition({
        name,
        exportPath: destinationPath,
      })

      if (!existing) {
        defineAndRegister(context, {
          identifier: createEnumClass(name),
          value: new KotlinEnumEntries({
            context,
            destinationPath,
            stringSchema,
            generatorKey,
          }),
          destinationPath,
        })
      }

      this.reference = name
    }
  }

  override toString(): string {
    // SLOT(string): a plain string is `String`; an inline enum renders the
    // synthesized enum class's name. A top-level enum model never reaches
    // here — `KotlinProjection` declares it directly (see shape.ts).
    //
    // SLOT(string-constraints): minLength / maxLength / pattern / format
    // live on this.stringSchema; Kotlin's type system cannot express them,
    // so they are dropped rather than encoded.
    return applyModifiers(this.reference ?? 'String', this.modifiers)
  }
}
