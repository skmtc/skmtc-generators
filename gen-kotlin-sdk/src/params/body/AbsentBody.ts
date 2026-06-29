import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'

type Args = {
  context: GenerateContextType
}

/**
 * The no-request-body shape (GET operations — the whole KS-D
 * surface): every contribution is empty, so the section Snippets
 * stay free of body conditionals.
 */
export class AbsentBody extends KtSnippet {
  constructorLeadLines: string[] = []
  constructorTailLines: string[] = []
  accessorSections: Stringable[] = []
  builderLeadVariables: string[] = []
  builderTailVariables: string[] = []
  setterSections: Stringable[] = []
  tailSetterSections: Stringable[] = []
  buildLeadArguments: string[] = []
  buildTailArguments: string[] = []
  bodyMethodSections: string[] = []
  nestedSections: Stringable[] = []
  equalsLeadNames: string[] = []
  equalsTailNames: string[] = []
  hasRequired = false
  fenceFields: string[] = []

  constructor({ context }: Args) {
    super({ context })
  }

  fromLeadAssignments(_fromParameter: string): string[] {
    return []
  }

  fromTailAssignments(_fromParameter: string): string[] {
    return []
  }

  override toString(): string {
    return ''
  }
}
