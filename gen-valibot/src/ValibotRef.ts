import { camelCase, decapitalize } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import type { GenerateContextType, GeneratorKey, RefName, Modifiers, OasRef, OasSchema, TypeSystemValue } from '@skmtc/core'

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

    this.name = decapitalize(camelCase(refName))
    this.refName = refName
    this.modifiers = modifiers
    this.destinationPath = destinationPath
    this.rootRef = rootRef

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const identifier = decapitalize(camelCase(this.refName))
    const content = identifier
    return applyModifiers(content, this.modifiers)
  }
}
