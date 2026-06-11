import type { GenerateContextType } from '@skmtc/core'
import { KtAnnotation, KtParameterList, KtSnippet } from '@skmtc/lang-kotlin'
import type { KtFunctionSignature } from '@skmtc/lang-kotlin'

type SpringServiceInterfaceArgs = {
  context: GenerateContextType
}

/**
 * The accumulated body of one `<Tag>Service` interface — the seam the
 * consumer implements as a Spring bean. Abstract signatures only, no
 * annotations, no Spring imports.
 */
export class SpringServiceInterface extends KtSnippet {
  methods: KtFunctionSignature[] = []

  constructor({ context }: SpringServiceInterfaceArgs) {
    super({ context })
  }

  add(method: KtFunctionSignature): void {
    this.methods.push(method)
  }

  override toString(): string {
    return this.methods.map(method => `${method}`).join('\n\n')
  }
}

type SpringControllerClassArgs = {
  context: GenerateContextType
  serviceName: string
  destinationPath: string
}

/**
 * The accumulated body of one `@RestController class <Tag>Controller` —
 * ALL the web plumbing, complete delegating bodies. Class-level
 * annotations ride `KtAnnotated`; the injected service rides
 * `KtConstructed`.
 */
export class SpringControllerClass extends KtSnippet {
  annotations: KtAnnotation[]
  constructorParameters: KtParameterList
  methods: KtFunctionSignature[] = []

  constructor({ context, serviceName, destinationPath }: SpringControllerClassArgs) {
    super({ context })

    this.annotations = [new KtAnnotation('RestController')]
    this.constructorParameters = new KtParameterList([
      { name: 'service', type: serviceName, visibility: 'private' }
    ])

    this.register({
      imports: { 'org.springframework.web.bind.annotation': ['RestController'] },
      destinationPath
    })
  }

  add(method: KtFunctionSignature): void {
    this.methods.push(method)
  }

  override toString(): string {
    return this.methods.map(method => `${method}`).join('\n\n')
  }
}
