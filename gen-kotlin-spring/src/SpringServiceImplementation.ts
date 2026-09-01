import type { GenerateContextType } from '@skmtc/core'
import { KtAnnotation, KtSnippet } from '@skmtc/lang-kotlin'
import type { KtFunctionSignature } from '@skmtc/lang-kotlin'
import { STEREOTYPE_PACKAGE } from './lib.ts'

type SpringServiceImplementationClassArgs = {
  context: GenerateContextType
  serviceName: string
  destinationPath: string
}

/**
 * The accumulated body of one `@Service class Default<Tag>Service` — a
 * starting point for the hand-written half, generated so that a large
 * document's signatures do not have to be typed out by hand.
 *
 * Every method answers `501 NOT_IMPLEMENTED` through the generated
 * `ApiErrorHandler`, so the application starts and every endpoint
 * responds before any logic exists. It is a SCAFFOLD: run `skmtc eject`
 * on the file before writing logic into it, which renames it, records it
 * in `settings.ejected` and stops generators writing it. (A hand-edited
 * generated file is protected from overwrite by the CLI as well, but
 * ejecting is what makes the ownership explicit.)
 *
 * The supertype clause renders inline in the value — lang-kotlin's
 * head+value model gives the value everything after `class <Name>`.
 */
export class SpringServiceImplementationClass extends KtSnippet {
  annotations: KtAnnotation[]
  description: string
  methods: KtFunctionSignature[] = []
  private serviceName: string

  constructor({ context, serviceName, destinationPath }: SpringServiceImplementationClassArgs) {
    super({ context })

    this.serviceName = serviceName
    this.description =
      `Scaffolded implementation of ${serviceName} — every method answers 501. ` +
      'Run `skmtc eject` on this file before replacing a body with real logic.'

    this.annotations = [
      new KtAnnotation({
        context,
        destinationPath,
        name: 'Service',
        packageName: STEREOTYPE_PACKAGE
      })
    ]
  }

  add(method: KtFunctionSignature): void {
    this.methods.push(method)
  }

  override toString(): string {
    const methods = this.methods.map(method => `${method}`).join('\n\n')

    return ` : ${this.serviceName} {\n${methods}\n}`
  }
}
