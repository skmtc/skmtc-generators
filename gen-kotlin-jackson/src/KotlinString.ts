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
import { toModelExportPath } from './lib.ts'
import { claimSynthesizedName } from './synthesizedNames.ts'

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
      const name = toSynthesizedName(context, stringSchema.stackTrail)

      // Same claim as the inline-object site: collisions live at PACKAGE
      // scope and across convergent keys — a probe hit on a name from a
      // DIFFERENT position would silently substitute the wrong type, so
      // the registry throws instead. The THROWING name derivation is
      // also deliberate (vs the union machinery's soft degrade): an
      // enum widened to `String` would discard its members — no honest
      // fallback exists, so an underivable position fails the subject.
      const claim = claimSynthesizedName(context, {
        name,
        stackTrail: stringSchema.stackTrail,
      })

      // ONE placement policy for every synthesized declaration: its own
      // models-package file — see the inline-object site for why.
      const exportPath = toModelExportPath(name)

      if (claim === 'declare') {
        defineAndRegister(context, {
          identifier: createEnumClass(name),
          value: new KotlinEnumEntries({
            context,
            destinationPath: exportPath,
            stringSchema,
            generatorKey,
          }),
          destinationPath: exportPath,
        })
      }

      this.register({
        imports: { [exportPath]: [name] },
        destinationPath,
      })

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
