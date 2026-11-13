import { toModelRef } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { ValibotProjection } from './ValibotProjection.ts'
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

    // A reference back to a model whose projection is being constructed
    // comes back `suspended`; any other reference inside a cycle comes back
    // `inCycle`. Both render `v.lazy(...)`: valibot reads a plain reference
    // when the module loads, and any model of a cycle can be the first one
    // loaded. `toModelRef` stitches the import in every case.
    const ref = toModelRef({
      context,
      refName,
      destinationPath,
      rootRef,
      projection: ValibotProjection,
      variant: 'main'
    })

    this.name = ref.settings.identifier.name
    this.terminal = ref.suspended || ref.inCycle
  }

  override toString(): string {
    const content = this.terminal ? `v.lazy(() => ${this.name})` : this.name
    return applyModifiers(content, this.modifiers)
  }
}
