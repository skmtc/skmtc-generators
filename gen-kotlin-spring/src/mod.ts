import { toGeneratorEnrichment, toOasOperationEntry } from '@skmtc/core'
import { createClass, createInterface, defineAndRegister } from '@skmtc/lang-kotlin'
import { toApiExportPath, toApiTag, toControllerName, toServiceName } from './apiFile.ts'
import { SpringControllerClass, SpringServiceInterface } from './SpringApiInterface.ts'
import { ensureApiErrorSupport } from './apiErrorSupport.ts'
import { SpringApiMethod } from './SpringApiMethod.ts'
import { generatorConfigSchema, toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-kotlin-spring operation entry. Per tag, ONE generated file holding
 * TWO declarations: `interface <Tag>Service` (the seam — DTO-typed, zero
 * Spring imports) and `@RestController class <Tag>Controller` (all web
 * plumbing, complete expression-bodied delegation into the injected
 * service). The consumer implements the service as a Spring bean
 * (`@Service class UsersServiceImpl : UsersService`) — pure business logic,
 * no web layer; Spring DI verifies the seam at startup.
 *
 * Untagged operations land in `DefaultApi`; a multi-tag operation joins its
 * FIRST tag only. Non-200 success codes render `@ResponseStatus`.
 *
 * Config (`basePackage`) is read from the `generator` enrichment scope
 * (`client.json#enrichments[id]._generator`), not constructor options — so
 * the generator runs CLI-only and carries no module state.
 */
export default toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, operation }) {
    const { basePackage } = toGeneratorEnrichment(context, denoJson.name, generatorConfigSchema)

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

    const method = new SpringApiMethod({ context, operation, destinationPath: exportPath })

    service.add(method.serviceSignature)
    controller.add(method.controllerSignature)
  }
})
