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
import { SpringServiceInterface } from './SpringServiceInterface.ts'
import { SpringControllerClass } from './SpringControllerClass.ts'
import { SpringServiceImplementationClass } from './SpringServiceImplementation.ts'
import { SpringTagApi } from './SpringTagApi.ts'
import { assertImplementationNameFree } from './serviceNames.ts'
import { ensureDefinition } from './ensureDefinition.ts'
import type { GeneratorConfig } from './enrichments.ts'

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
  const { basePackage, basePath, emitServiceImplementations } = config

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
    toValue: () =>
      new SpringControllerClass({
        context,
        serviceName,
        destinationPath: exportPath,
        basePath: basePath ?? ''
      })
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
