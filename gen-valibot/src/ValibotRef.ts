import { toModelRef } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { ValibotProjection } from './ValibotProjection.ts'
import type { GenerateContextType, GeneratorKey, RefParts, Modifiers, OasRef, OasSchema } from '@skmtc/core'

type ValibotRefArgs = {
  context: GenerateContextType
  destinationPath: string
  ref: RefParts
  modifiers: Modifiers
  generatorKey: GeneratorKey
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class ValibotRef extends TsSnippet {
  type = 'ref' as const
  name: string
  ref: RefParts
  modifiers: Modifiers
  destinationPath: string
  terminal: boolean
  /** The model's `variantKeys` (see `isVariantOption`); none for a `v.lazy` or nullable reference. */
  variantKeys: string[]

  constructor({
    context,
    ref,
    destinationPath,
    modifiers,
    generatorKey,
    schema
  }: ValibotRefArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.ref = ref
    this.modifiers = modifiers
    this.destinationPath = destinationPath

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })

    // A reference back to a model whose projection is being constructed
    // comes back `suspended`; any other reference inside a cycle comes back
    // `inCycle`. Both render `v.lazy(...)`: valibot reads a plain reference
    // when the module loads, and any model of a cycle can be the first one
    // loaded. `toModelRef` stitches the import in every case.
    const modelRef = toModelRef({
      context,
      ref,
      destinationPath,
      projection: ValibotProjection,
      variant: 'main'
    })

    this.name = modelRef.settings.identifier.name
    this.terminal = modelRef.suspended || modelRef.inCycle
    this.variantKeys = modelRef.suspended || modelRef.inCycle || modifiers.nullable ? [] : modelRef.definition.value.variantKeys
  }

  override toString(): string {
    const content = this.terminal ? `v.lazy(() => ${this.name})` : this.name
    return applyModifiers(content, this.modifiers)
  }
}
