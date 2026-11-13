import { toModelGeneratorKey, toModelRef } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  Modifiers,
  OasRef,
  OasSchema,
  RefName,
} from '@skmtc/core'
import { applyModifiers } from './modifiers.ts'
import { KotlinProjection } from './KotlinProjection.ts'
import { kotlinJacksonEntry } from './mod.ts'

type KotlinRefArgs = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

/**
 * A $ref. Only the peer's NAME lands in this value tree — the Driver (or
 * the recursion branch) resolves the definition and stitches the
 * cross-file import. Never inline-expand a ref and never hand-write its
 * import. This is what makes `Address`, referenced twice by `Order`, one
 * definition in one file.
 */
export class KotlinRef extends KtSnippet {
  type = 'ref' as const
  modifiers: Modifiers
  name: string
  terminal: boolean

  constructor(
    { context, refName, destinationPath, modifiers, rootRef, schema }:
      KotlinRefArgs,
  ) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: kotlinJacksonEntry.id,
        refName,
        variant: 'main',
      }),
      stackTrail: schema?.stackTrail.clone(),
    })

    // A reference back to a model whose projection is being constructed
    // comes back `suspended`, so the peer is not constructed again. Any
    // other model is constructed or reused, and `toModelRef` stitches the
    // import (KtFile leaves out a same-package one).
    const ref = toModelRef({
      context,
      refName,
      destinationPath,
      rootRef,
      projection: KotlinProjection,
      variant: 'main',
    })

    this.name = ref.settings.identifier.name
    this.modifiers = modifiers
    this.terminal = ref.suspended
  }

  override toString(): string {
    // SLOT(lazy): Kotlin needs no deferred-reference form. A JVM class
    // may name itself in its own body (`children: List<Category>?`), so a
    // recursive back-reference renders exactly like any other — the
    // `terminal` flag only records that this was a reference back; it does
    // not change the syntax. That is also why SLOT(recursion-annotation) in
    // `KotlinProjection` is empty: there is no circular-inference failure
    // to break.
    return applyModifiers(this.name, this.modifiers)
  }
}
