import { KtSnippet, createSealedInterface } from '@skmtc/lang-kotlin'
import { defineAndRegister } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasUnion,
  OasUnknown,
  TypeSystemValue
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { getInvalidUnionHint, getUnionHint } from './unionHints.ts'
import { KtSealedInterfaceValue } from './KtSealedInterfaceValue.ts'
import { toKtModelExportPath } from './base.ts'

type KtUnknownArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema?: OasUnknown
}

/** Unknown schema → `kotlinx.serialization.json.JsonElement`. */
export class KtUnknown extends KtSnippet {
  type = 'unknown' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: KtUnknownArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({
      imports: { 'kotlinx.serialization.json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers('JsonElement', this.modifiers)
  }
}

type KtUnionArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema: OasUnion
}

/**
 * Union (`oneOf`) schema at the VALUE layer → `JsonElement`, the
 * documented fallback. A QUALIFYING discriminated union never reaches
 * this class at the top level (`toKtProjection` routes it to the
 * sealed-interface projection); inline unions can never be sealed (no
 * refName for the membership inversion), so they take the fallback
 * here. Members are deliberately NOT built — building them would
 * synthesize unused data classes.
 *
 * Single-member unions never reach this class at all: core's parse
 * collapses `oneOf: [X]` into `X` itself (spec 22 decision 4 turned out
 * to be satisfied upstream — verified against core 0.9.0: inline
 * members collapse to the member schema, ref members to the ref).
 */
export class KtUnion extends KtSnippet {
  type = 'union' as const
  members: TypeSystemValue[] = []
  discriminator: string | undefined = undefined
  modifiers: Modifiers
  /** Set when a valid inline hint upgrades this union to a sealed
   * interface (spec 26): the synthesized parent's name, rendered in
   * place of `JsonElement`. */
  sealedName: string | undefined

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: KtUnionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers

    // Decision 2 (spec 26): a hint that failed validation fails the
    // item LOUDLY — never a silent JsonElement fallback.
    const invalidReason = getInvalidUnionHint(context, schema)

    if (invalidReason) {
      throw new Error(invalidReason)
    }

    const hint = getUnionHint(context, schema)

    if (hint) {
      this.sealedName = hint.name
      this.discriminator = hint.propertyName

      const exportPath = toKtModelExportPath(hint.name)

      // Synthesize the sealed parent once (the accumulator-precedent
      // findDefinition + defineAndRegister pair); members gain their
      // `: Parent` clauses through the membership scan.
      if (!context.findDefinition({ name: hint.name, exportPath })) {
        defineAndRegister(context, {
          identifier: createSealedInterface(hint.name),
          value: new KtSealedInterfaceValue({
            context,
            unionSchema: schema,
            destinationPath: exportPath
          }),
          destinationPath: exportPath
        })
      }

      // The referencing file imports the synthesized parent (rendered
      // bare under same-package suppression — correct in v1's single
      // basePackage).
      this.register({
        imports: { [exportPath]: [hint.name] },
        destinationPath
      })

      return
    }

    this.register({
      imports: { 'kotlinx.serialization.json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers(this.sealedName ?? 'JsonElement', this.modifiers)
  }
}
