import type { OasRef, OasSchema } from '@skmtc/core'
import { ModelDriver, toModelGeneratorKey } from '@skmtc/core'
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

    if (context.modelDepth[`${arktypeEntry.id}:${refName}`] > 0) {
      // A back-reference to a model still open on the build stack. Driving it
      // again would recurse forever, so read its settings without building.
      //
      // `ZodRef` also bumps the counter here, because `ZodProjection` reads
      // `> 1` to decide whether to annotate the export and break TypeScript's
      // circular inference. Arktype has no such annotation — a cycle cannot be
      // expressed in a lone `type(…)` at all (see `toString`) — so nothing
      // would read the bump, and it is not made.
      const settings = context.toModelContentSettings({
        refName,
        projection: ArktypeProjection,
        variant: 'main'
      })

      // Not always the same file: with mutual recursion (A → B → A) the
      // back-reference lands in B, so the name still has to be imported. The
      // engine cannot stitch this one, because nothing was inserted.
      this.register({
        imports: { [settings.exportPath]: [settings.identifier.name] },
        destinationPath
      })

      this.name = settings.identifier.name
      this.terminal = true
    } else {
      // Building the referenced model is what makes it exist AND what stitches
      // its import into this file.
      const { settings } = new ModelDriver({
        context,
        refName,
        destinationPath,
        rootRef,
        projection: ArktypeProjection,
        variant: 'main'
      })

      this.name = settings.identifier.name
      this.terminal = false
    }

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
