import { ContentBase, camelCase, decapitalize } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type {
  GenerateContext,
  GeneratorKey,
  RefName,
  Modifiers,
  TypeSystemValue
} from '@skmtc/core'

type ValibotRefArgs = {
  context: GenerateContext
  destinationPath: string
  refName: RefName
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ValibotRef extends ContentBase {
  type = 'ref' as const
  name: string
  refName: RefName
  modifiers: Modifiers
  destinationPath: string
  rootRef?: RefName

  constructor({ context, refName, destinationPath, modifiers, generatorKey, rootRef }: ValibotRefArgs) {
    super({ context, generatorKey })

    this.name = decapitalize(camelCase(refName))
    this.refName = refName
    this.modifiers = modifiers
    this.destinationPath = destinationPath
    this.rootRef = rootRef

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    const identifier = decapitalize(camelCase(this.refName))
    const content = identifier
    return applyModifiers(content, this.modifiers)
  }
}