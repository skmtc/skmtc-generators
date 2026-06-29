import { createAbstractRecord, defineAndRegister, CsSnippet } from '@skmtc/lang-csharp'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasUnion,
  OasUnknown,
  TypeSystemValue
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toCsModelExportPath } from './base.ts'
import { CsPolymorphicParentValue } from './CsPolymorphicParentValue.ts'
import { getInvalidUnionHint, getUnionHint } from './unionHints.ts'

type CsUnknownArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema?: OasUnknown
}

/** Unknown schema → `System.Text.Json.JsonElement` (D13). */
export class CsUnknown extends CsSnippet {
  type = 'unknown' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: CsUnknownArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({
      imports: { 'System.Text.Json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers('JsonElement', this.modifiers)
  }
}

type CsUnionArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema: OasUnion
}

/**
 * Union (`oneOf`) schema at the VALUE layer. A QUALIFYING discriminated
 * union never reaches this class at the top level (`toCsProjection`
 * routes it to the abstract-record projection); an INLINE union takes
 * one of two paths (CD3, the spec-26 port):
 *
 * - a VALID consumer hint upgrades it: the parent is synthesized once
 *   at its canonical path (`findDefinition` + `defineAndRegister`) and
 *   referenced by name; members gain their ` : Parent` clauses through
 *   the membership scan.
 * - a hint that failed validation fails the item LOUDLY (decision 2) —
 *   never a silent fallback.
 * - no hint → `JsonElement`, the documented fallback (D13). Members
 *   are deliberately NOT built — building them would synthesize unused
 *   records.
 *
 * Single-member unions never reach this class at all: core's parse
 * collapses `oneOf: [X]` into `X` itself (verified against core 0.9.0).
 */
export class CsUnion extends CsSnippet {
  type = 'union' as const
  members: TypeSystemValue[] = []
  discriminator: string | undefined = undefined
  modifiers: Modifiers
  /** Set when a valid inline hint upgrades this union: the synthesized
   * parent's name, rendered in place of `JsonElement`. */
  polymorphicName: string | undefined

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: CsUnionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers

    const invalidReason = getInvalidUnionHint(context, schema)

    if (invalidReason) {
      throw new Error(invalidReason)
    }

    const hint = getUnionHint(context, schema)

    if (hint) {
      this.polymorphicName = hint.name
      this.discriminator = hint.propertyName

      const exportPath = toCsModelExportPath(hint.name)
      const existing = context.findDefinition({ name: hint.name, exportPath })

      if (existing && !(existing.value instanceof CsPolymorphicParentValue)) {
        throw new Error(
          `@skmtc/gen-csharp: found a definition named '${hint.name}' at '${exportPath}' ` +
            `that is not a synthesized polymorphic parent — name collision, or two copies ` +
            `of the generator module are loaded`
        )
      }

      if (!existing) {
        defineAndRegister(context, {
          identifier: createAbstractRecord(hint.name),
          value: new CsPolymorphicParentValue({
            context,
            unionSchema: schema,
            destinationPath: exportPath
          }),
          destinationPath: exportPath
        })
      }

      // The referencing file imports the synthesized parent (suppressed
      // under same-namespace in the single-baseNamespace case).
      this.register({
        imports: { [exportPath]: [hint.name] },
        destinationPath
      })

      return
    }

    this.register({
      imports: { 'System.Text.Json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers(this.polymorphicName ?? 'JsonElement', this.modifiers)
  }
}
