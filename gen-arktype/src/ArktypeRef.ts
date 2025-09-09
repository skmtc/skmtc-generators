import { ContentBase, camelCase, decapitalize } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type {
  GenerateContext,
  GeneratorKey,
  RefName,
  Modifiers,
  TypeSystemValue
} from '@skmtc/core'

type ArktypeRefArgs = {
  context: GenerateContext
  destinationPath: string
  refName: RefName
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeRef extends ContentBase {
  type = 'ref' as const
  name: string
  refName: RefName
  modifiers: Modifiers
  destinationPath: string
  rootRef?: RefName

  constructor({ context, refName, destinationPath, modifiers, generatorKey, rootRef }: ArktypeRefArgs) {
    super({ context, generatorKey })

    this.name = decapitalize(camelCase(refName))
    this.refName = refName
    this.modifiers = modifiers
    this.destinationPath = destinationPath
    this.rootRef = rootRef

    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    const identifier = decapitalize(camelCase(this.refName))
    
    // If no modifiers, just return the identifier
    if (this.modifiers.required && !this.modifiers.nullable) {
      return identifier
    }
    
    // Apply modifiers to the reference
    return applyModifiers(identifier, this.modifiers)
  }
}