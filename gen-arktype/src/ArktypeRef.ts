import type { OasRef, OasSchema } from '@skmtc/core'
import { toModelGeneratorKey, toModelRef } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyValueModifiers } from './applyModifiers.ts'
import { ArktypeProjection } from './ArktypeProjection.ts'
import { arktypeEntry } from './mod.ts'
import type { GenerateContextType, RefName, Modifiers } from '@skmtc/core'

type ArktypeRefArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  modifiers: Modifiers
  rootRef?: RefName
}

export class ArktypeRef extends TsSnippet {
  type = 'ref' as const
  // A name only resolves inside an arktype scope, so a ref can never be spelled
  // in string syntax: `type("user")` reports `'user' is unresolvable`. It is
  // referenced as the `Type` value itself.
  stringSyntax = undefined
  atomicStringSyntax = undefined
  modifiers: Modifiers
  name: string
  terminal: boolean

  constructor({ context, refName, destinationPath, modifiers, rootRef, schema }: ArktypeRefArgs) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: arktypeEntry.id,
        refName,
        variant: 'main'
      }),
      stackTrail: schema?.stackTrail.clone()
    })

    // A reference back to a model whose projection is being constructed
    // comes back `suspended`, so the model is not constructed again;
    // `toModelRef` stitches the import in every case. Only the reference back
    // renders as a thunk: a lone `type(…)` cannot defer a cycle anyway (see
    // `toString`).
    const ref = toModelRef({
      context,
      refName,
      destinationPath,
      rootRef,
      projection: ArktypeProjection,
      variant: 'main'
    })

    this.name = ref.settings.identifier.name
    this.terminal = ref.suspended
    this.modifiers = modifiers
  }

  override toString(): string {
    // A thunk is arktype's spelling for a cyclic reference, but it only defers
    // inside a `scope` / `type.module` — a lone `type(…)` invokes it while
    // parsing, so a self-recursive model still throws at run time. Emitted
    // because it is the closest correct shape; genuine cycles need the whole
    // file to become one `type.module({ … })`.
    const value = this.terminal ? `() => ${this.name}` : this.name

    return applyValueModifiers(value, this.modifiers)
  }
}
