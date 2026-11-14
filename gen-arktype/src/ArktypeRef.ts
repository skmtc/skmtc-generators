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
    // comes back `suspended`; `toModelRef` stitches the import in every case.
    const ref = toModelRef({
      context,
      refName,
      destinationPath,
      rootRef,
      projection: ArktypeProjection,
      variant: 'main'
    })

    // A lone `type(…)` reads its references when its module loads, and runs
    // a thunk while it parses, so no spelling defers a reference back. A
    // cycle needs its models in one `scope`, which this generator does not
    // render.
    if (ref.suspended) {
      throw new Error(
        `${refName} is recursive, which gen-arktype cannot render: each model is a lone type(…), and a reference back to ${refName} fails when the module loads. Remove the cycle from the schema to generate it with gen-arktype.`
      )
    }

    this.name = ref.settings.identifier.name
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyValueModifiers(this.name, this.modifiers)
  }
}
