import type { GenerateContextType } from '@skmtc/core'
import { KtAnnotation, KtParameterList, KtSnippet } from '@skmtc/lang-kotlin'
import type { KtFunctionSignature } from '@skmtc/lang-kotlin'
import { WEB_BIND_ANNOTATION_PACKAGE } from './lib.ts'

type SpringControllerClassArgs = {
  context: GenerateContextType
  serviceName: string
  destinationPath: string
}

/**
 * The accumulated body of one `@RestController class <Tag>Controller` —
 * ALL the web plumbing, complete delegating bodies. Class-level
 * annotations ride `KtAnnotated`; the injected-service primary
 * constructor and the braced body render HERE — the value owns
 * everything after the head (the retired `KtConstructed` protocol is
 * gone).
 */
export class SpringControllerClass extends KtSnippet {
  annotations: KtAnnotation[]
  constructorParameters: KtParameterList
  methods: KtFunctionSignature[] = []

  constructor({ context, serviceName, destinationPath }: SpringControllerClassArgs) {
    super({ context })

    this.annotations = [
      new KtAnnotation({
        context,
        destinationPath,
        name: 'RestController',
        packageName: WEB_BIND_ANNOTATION_PACKAGE
      })
    ]
    this.constructorParameters = new KtParameterList([
      { name: 'service', type: serviceName, visibility: 'private' }
    ])
  }

  add(method: KtFunctionSignature): void {
    this.methods.push(method)
  }

  override toString(): string {
    return `${this.constructorParameters} {\n${this.methods.map(method => `${method}`).join('\n\n')}\n}`
  }
}
