import { toGeneratorEnrichment, toOasOperationEntry } from '@skmtc/core'
import { createClass, createInterface, defineAndRegister } from '@skmtc/lang-kotlin'
import {
  toApiExportPath,
  toApiTag,
  toControllerName,
  toServiceImplementationExportPath,
  toServiceImplementationName,
  toServiceName
} from './apiFile.ts'
import { SpringControllerClass, SpringServiceInterface } from './SpringApiInterface.ts'
import { ensureApiErrorSupport } from './apiErrorSupport.ts'
import { SpringApiMethod } from './SpringApiMethod.ts'
import { SpringServiceImplementationClass } from './SpringServiceImplementation.ts'
import { assertImplementationNameFree } from './serviceNames.ts'
import { generatorConfigSchema, toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-kotlin-spring operation entry. Per tag, ONE generated file holding
 * TWO declarations: `interface <Tag>Service` (the seam — DTO-typed, zero
 * Spring imports) and `@RestController class <Tag>Controller` (all web
 * plumbing, complete expression-bodied delegation into the injected
 * service). The consumer implements the service as a Spring bean
 * (`@Service class DefaultUsersService : UsersService`) — pure business logic,
 * no web layer; Spring DI verifies the seam at startup.
 *
 * Untagged operations land in `DefaultApi`; a multi-tag operation joins its
 * FIRST tag only. Non-200 success codes render `@ResponseStatus`.
 *
 * With the `emitServiceImplementations` enrichment on, a
 * `Default<Tag>Service.generated.kt` scaffold is written beside each tag
 * file — every method throwing 501 — as a starting point for the
 * hand-written half. Eject it before writing logic into it.
 *
 * Config (`basePackage`) is read from the `generator` enrichment scope
 * (`client.json#enrichments[id]._generator`), not constructor options — so
 * the generator runs CLI-only and carries no module state.
 */
export default toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, operation }) {
    const { basePackage, emitServiceImplementations } = toGeneratorEnrichment(
      context,
      denoJson.name,
      generatorConfigSchema
    )

    ensureApiErrorSupport(context, basePackage)

    const tag = toApiTag(operation.tags)
    const serviceName = toServiceName(tag)
    const controllerName = toControllerName(tag)
    const exportPath = toApiExportPath(tag, basePackage)

    const existingService = context.findDefinition({ name: serviceName, exportPath })

    const service =
      existingService?.value instanceof SpringServiceInterface
        ? existingService.value
        : defineAndRegister(context, {
            identifier: createInterface(serviceName),
            value: new SpringServiceInterface({ context }),
            destinationPath: exportPath
          }).value

    const existingController = context.findDefinition({ name: controllerName, exportPath })

    const controller =
      existingController?.value instanceof SpringControllerClass
        ? existingController.value
        : defineAndRegister(context, {
            identifier: createClass(controllerName),
            value: new SpringControllerClass({ context, serviceName, destinationPath: exportPath }),
            destinationPath: exportPath
          }).value

    // Named and checked BEFORE the method builder runs: it registers imports
    // against the implementation path, and a registration alone is enough to
    // emit the file — so a later throw would leave an import-only shell behind.
    const implementationName = emitServiceImplementations
      ? toServiceImplementationName(tag)
      : undefined

    if (implementationName) {
      assertImplementationNameFree({ context, implementationName, tag })
    }

    const implementationPath = implementationName
      ? toServiceImplementationExportPath(tag, basePackage)
      : undefined

    const method = new SpringApiMethod({
      context,
      operation,
      destinationPath: exportPath,
      implementationPath
    })

    service.add(method.serviceSignature)
    controller.add(method.controllerSignature)

    if (implementationPath !== undefined && implementationName && method.implementationSignature) {
      const existingImplementation = context.findDefinition({
        name: implementationName,
        exportPath: implementationPath
      })

      const implementation =
        existingImplementation?.value instanceof SpringServiceImplementationClass
          ? existingImplementation.value
          : defineAndRegister(context, {
              identifier: createClass(implementationName),
              value: new SpringServiceImplementationClass({
                context,
                serviceName,
                destinationPath: implementationPath
              }),
              destinationPath: implementationPath
            }).value

      implementation.add(method.implementationSignature)
    }
  }
})
