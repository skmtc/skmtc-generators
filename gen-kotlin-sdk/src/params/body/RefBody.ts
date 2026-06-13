import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { kdoc } from '@/format.ts'
import { sdkConfig as config } from '@/config.ts'
import type { BodyShape } from '@/params/body/BodySnippet.ts'

type Args = {
  context: GenerateContextType
  body: Extract<BodyShape, { kind: 'ref' }>
  destinationPath: string
}

/**
 * The declared-model-component request-body shape (corpus:
 * ChallengeResponse): one field named after the component, typed by
 * its standalone model class. No flattening, no nested class.
 */
export class RefBody extends KtSnippet {
  body: Extract<BodyShape, { kind: 'ref' }>
  constructorLeadLines: string[]
  constructorTailLines: string[] = []
  accessorSections: Stringable[]
  builderLeadVariables: string[]
  builderTailVariables: string[] = []
  setterSections: Stringable[]
  tailSetterSections: Stringable[] = []
  buildLeadArguments: string[]
  buildTailArguments: string[] = []
  bodyMethodSections: string[]
  nestedSections: Stringable[] = []
  equalsLeadNames: string[]
  equalsTailNames: string[] = []
  hasRequired = true
  fenceFields: string[]

  constructor({ context, body, destinationPath }: Args) {
    super({ context })
    this.body = body

    const { className, kotlinName, description } = body
    const descriptionKdoc = description ? `${kdoc([description])}\n` : ''

    this.constructorLeadLines = [`private val ${kotlinName}: ${className},`]
    this.builderLeadVariables = [`private var ${kotlinName}: ${className}? = null`]
    this.buildLeadArguments = [`checkRequired("${kotlinName}", ${kotlinName}),`]
    this.bodyMethodSections = [`fun _body(): ${className} = ${kotlinName}`]
    this.equalsLeadNames = [kotlinName]
    this.fenceFields = [kotlinName]

    this.accessorSections = [
      `${descriptionKdoc}fun ${kotlinName}(): ${className} = ${kotlinName}`,
      `fun _additionalBodyProperties(): Map<String, JsonValue> = ${kotlinName}._additionalProperties()`
    ]

    this.setterSections = [
      `${descriptionKdoc}fun ${kotlinName}(${kotlinName}: ${className}) = apply {
    this.${kotlinName} = ${kotlinName}
}`
    ]

    this.register({
      imports: {
        [`${config.basePackage}.core`]: ['JsonValue', 'checkRequired'],
        // Same-package suppression drops this in the flat layout (the
        // corpus case); the by-resource layout genuinely needs it.
        [`${config.basePackage}.models`]: [className]
      },
      destinationPath
    })
  }

  fromLeadAssignments(fromParameter: string): string[] {
    return [`${this.body.kotlinName} = ${fromParameter}.${this.body.kotlinName}`]
  }

  fromTailAssignments(_fromParameter: string): string[] {
    return []
  }

  override toString(): string {
    return ''
  }
}
