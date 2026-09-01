import { createClass, createInterface } from '@skmtc/lang-kotlin'
import type { GenerateContextType, OasOperation } from '@skmtc/core'
import {
  toApiExportPath,
  toApiTag,
  toControllerName,
  toServiceImplementationExportPath,
  toServiceImplementationName,
  toServiceName
} from './apiFile.ts'
import { SpringControllerClass, SpringServiceInterface } from './SpringApiInterface.ts'
import { SpringServiceImplementationClass } from './SpringServiceImplementation.ts'
import { SpringApiMethod } from './SpringApiMethod.ts'
import { assertImplementationNameFree } from './serviceNames.ts'
import { ensureDefinition } from './ensureDefinition.ts'
import type { GeneratorConfig } from './enrichments.ts'

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

type EnsureTagApiArgs = {
  context: GenerateContextType
  operation: OasOperation
  config: GeneratorConfig
}

/**
 * The tag file's declarations, created on the first operation of a tag and
 * reused by the rest — the cache is the only thing that knows which.
 *
 * The scaffold is named and checked here, BEFORE any operation reaches
 * {@link SpringTagApi.add}: the method builder registers imports against the
 * implementation path, and a registration alone emits the file, so a name
 * collision throwing later would leave an import-only shell behind.
 */
export const ensureTagApi = ({ context, operation, config }: EnsureTagApiArgs): SpringTagApi => {
  const { basePackage, emitServiceImplementations } = config

  const tag = toApiTag(operation.tags)
  const serviceName = toServiceName(tag)
  const exportPath = toApiExportPath(tag, basePackage)

  const service = ensureDefinition({
    context,
    identifier: createInterface(serviceName),
    destinationPath: exportPath,
    valueClass: SpringServiceInterface,
    toValue: () => new SpringServiceInterface({ context })
  })

  const controller = ensureDefinition({
    context,
    identifier: createClass(toControllerName(tag)),
    destinationPath: exportPath,
    valueClass: SpringControllerClass,
    toValue: () => new SpringControllerClass({ context, serviceName, destinationPath: exportPath })
  })

  if (!emitServiceImplementations) {
    return new SpringTagApi({
      context,
      exportPath,
      service,
      controller,
      implementationPath: undefined,
      implementation: undefined
    })
  }

  const implementationName = toServiceImplementationName(tag)

  assertImplementationNameFree({ context, implementationName, tag })

  const implementationPath = toServiceImplementationExportPath(tag, basePackage)

  const implementation = ensureDefinition({
    context,
    identifier: createClass(implementationName),
    destinationPath: implementationPath,
    valueClass: SpringServiceImplementationClass,
    toValue: () =>
      new SpringServiceImplementationClass({
        context,
        serviceName,
        destinationPath: implementationPath
      })
  })

  return new SpringTagApi({
    context,
    exportPath,
    service,
    controller,
    implementationPath,
    implementation
  })
}
