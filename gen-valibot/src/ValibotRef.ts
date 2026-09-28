import { ModelDriver } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { ValibotProjection } from './ValibotProjection.ts'
import { ValibotBase } from './base.ts'
import type { GenerateContextType, GeneratorKey, RefName, Modifiers, OasRef, OasSchema } from '@skmtc/core'

type ValibotRefArgs = {
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class ValibotRef extends TsSnippet {
  type = 'ref' as const
  name: string
  refName: RefName
  modifiers: Modifiers
  destinationPath: string
  rootRef?: RefName
  terminal: boolean

  constructor({
    context,
    refName,
    destinationPath,
    modifiers,
    generatorKey,
    rootRef,
    schema
  }: ValibotRefArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.refName = refName
    this.modifiers = modifiers
    this.destinationPath = destinationPath
    this.rootRef = rootRef

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })

    if (context.modelDepth[`${ValibotBase.id}:${refName}`] > 0) {
      // A back-reference to a model still open on the build stack. Driving it
      // again would recurse forever, so read its settings without building,
      // and import the name by hand: with mutual recursion (A → B → A) the
      // back-reference lands in another file, and nothing was inserted for
      // the engine to stitch.
      const settings = context.toModelContentSettings({
        refName,
        projection: ValibotProjection,
        variant: 'main'
      })

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
        projection: ValibotProjection,
        variant: 'main'
      })

      this.name = settings.identifier.name
      this.terminal = false
    }
  }

  override toString(): string {
    const content = this.terminal ? `v.lazy(() => ${this.name})` : this.name
    return applyModifiers(content, this.modifiers)
  }
}
