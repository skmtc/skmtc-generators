import { toOasOperationEntry } from '@skmtc/core'
import { createClass, createInterface, defineAndRegister } from '@skmtc/lang-kotlin'
import { setBasePackage } from './basePackage.ts'
import { toApiExportPath, toApiTag, toControllerName, toServiceName } from './apiFile.ts'
import { SpringControllerClass, SpringServiceInterface } from './SpringApiInterface.ts'
import { ensureApiErrorSupport } from './apiErrorSupport.ts'
import { SpringApiMethod } from './SpringApiMethod.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Options for {@link toKotlinSpringEntry}.
 */
export type KotlinSpringEntryOptions = {
  /**
   * REQUIRED: the Kotlin package generated `<Tag>Api` files land in
   * (e.g. `'com.example.api'`). Encoded into every export path so with
   * `client.json#settings.basePath` at the Gradle source root, files
   * land on the package-=-folder convention. May equal or differ from
   * gen-kotlin's `basePackage`. There is deliberately no default.
   */
  basePackage: string
}

/**
 * Factory for the gen-kotlin-spring operation entry. Per tag, ONE
 * generated file holding TWO declarations: `interface <Tag>Service`
 * (the seam — DTO-typed, zero Spring imports) and
 * `@RestController class <Tag>Controller` (all web plumbing, complete
 * expression-bodied delegation into the injected service). The
 * consumer implements the service as a Spring bean
 * (`@Service class UsersServiceImpl : UsersService`) — pure business
 * logic, no web layer; Spring DI verifies the seam at startup.
 *
 * Untagged operations land in `DefaultApi`; a multi-tag operation
 * joins its FIRST tag only. Non-200 success codes render
 * `@ResponseStatus`. Like `toKotlinEntry` there is NO default-config
 * entry export: `basePackage` has no safe default.
 */
export const toKotlinSpringEntry = (options: KotlinSpringEntryOptions) => {
  setBasePackage(options.basePackage)

  return toOasOperationEntry<EnrichmentSchema>({
    id: denoJson.name,
    toEnrichmentSchema,
    transform({ context, operation }) {
      ensureApiErrorSupport(context)

      const tag = toApiTag(operation.tags)
      const serviceName = toServiceName(tag)
      const controllerName = toControllerName(tag)
      const exportPath = toApiExportPath(tag)

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
}
