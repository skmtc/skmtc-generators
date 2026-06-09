import type { OasRef, OasSchema } from '@skmtc/core'
import { camelCase, decapitalize, SnippetBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type {
  GenerateContextType,
  GeneratorKey,
  RefName,
  Modifiers,
  TypeSystemValue
} from '@skmtc/core'

type ArktypeRefArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeRef extends SnippetBase {
  type = 'ref' as const
  name: string
  refName: RefName
  modifiers: Modifiers
  destinationPath: string
  rootRef?: RefName

  constructor({ context, refName, destinationPath, modifiers, generatorKey, rootRef, schema }: ArktypeRefArgs) {
    super({ context, generatorKey, schema })

    this.name = decapitalize(camelCase(refName))
    this.refName = refName
    this.modifiers = modifiers
    this.destinationPath = destinationPath
    this.rootRef = rootRef

    this.register({ imports: { arktype: ['type'] }, destinationPath })
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