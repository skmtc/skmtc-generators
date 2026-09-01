import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { SpringServiceInterface } from './SpringServiceInterface.ts'
import { SpringControllerClass } from './SpringControllerClass.ts'
import { SpringServiceImplementationClass } from './SpringServiceImplementation.ts'
import { SpringApiMethod } from './SpringApiMethod.ts'

type SpringTagApiArgs = {
  context: GenerateContextType
  exportPath: string
  service: SpringServiceInterface
  controller: SpringControllerClass
  implementationPath: string | undefined
  implementation: SpringServiceImplementationClass | undefined
}

/**
 * One tag's declarations, and where each part of an operation belongs among
 * them: the abstract signature on the service interface, the annotated
 * delegation on the controller, the 501 override on the scaffold.
 *
 * Holding them together is what lets the entry stay a dispatch — it hands
 * over an operation without knowing that a tag produces three declarations
 * across two files, or which of them an operation touches.
 */
export class SpringTagApi {
  private context: GenerateContextType
  private exportPath: string
  private service: SpringServiceInterface
  private controller: SpringControllerClass
  private implementationPath: string | undefined
  private implementation: SpringServiceImplementationClass | undefined

  constructor(
    { context, exportPath, service, controller, implementationPath, implementation }: SpringTagApiArgs
  ) {
    this.context = context
    this.exportPath = exportPath
    this.service = service
    this.controller = controller
    this.implementationPath = implementationPath
    this.implementation = implementation
  }

  add(operation: OasOperation): void {
    const method = new SpringApiMethod({
      context: this.context,
      operation,
      destinationPath: this.exportPath,
      implementationPath: this.implementationPath
    })

    this.service.add(method.serviceSignature)
    this.controller.add(method.controllerSignature)

    if (this.implementation && method.implementationSignature) {
      this.implementation.add(method.implementationSignature)
    }
  }
}
