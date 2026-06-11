import { toOasOperationEntry } from '@skmtc/core'
import { createClass, createInterface, defineAndRegister } from '@skmtc/lang-csharp'
import { setBaseNamespace } from './baseNamespace.ts'
import { toApiExportPath, toApiTag, toControllerName, toServiceName } from './apiFile.ts'
import { AspnetControllerClass, AspnetServiceInterface } from './AspnetApiClasses.ts'
import { AspnetApiMethod } from './AspnetApiMethod.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Options for {@link toCsharpAspnetEntry}.
 */
export type CsharpAspnetEntryOptions = {
  /**
   * REQUIRED: the C# namespace generated `<Tag>Api` files land in
   * (e.g. `'Acme.Api'`). Encoded into every export path so with
   * `client.json#settings.basePath` at the consumer's project source
   * root, files land on the folder-=-namespace convention. May equal
   * or differ from gen-csharp's `baseNamespace`. There is deliberately
   * no default.
   */
  baseNamespace: string
}

/**
 * Factory for the gen-csharp-aspnet operation entry. Per tag, ONE
 * generated file holding TWO declarations: `public interface
 * I<Tag>Service` (the seam — DTO-typed, `Task`-returning, zero ASP.NET
 * imports) and `[ApiController] public sealed partial class
 * <Tag>Controller(I<Tag>Service service) : ControllerBase` (all web
 * plumbing, complete expression-bodied delegation into the injected
 * service). The consumer implements the interface and registers it in
 * DI (`builder.Services.AddScoped<IUsersService, UsersService>()`) —
 * pure business logic, no web layer; DI verifies the seam at startup.
 *
 * Untagged operations land in `DefaultApi`; a multi-tag operation
 * joins its FIRST tag only. Non-200 success codes follow the CC4
 * status map (201/202 `StatusCode`, 204 via the generated
 * `GeneratedResults.NoContent` helper). Like `toCsharpEntry` there is
 * NO default-config entry export: `baseNamespace` has no safe
 * default; module state is written idempotently at the top of
 * `transform` (the note-30 lesson 1).
 */
export const toCsharpAspnetEntry = (options: CsharpAspnetEntryOptions) => {
  return toOasOperationEntry({
    id: denoJson.name,
    transform({ context, operation }) {
      setBaseNamespace(options.baseNamespace)

      const tag = toApiTag(operation.tags)
      const serviceName = toServiceName(tag)
      const controllerName = toControllerName(tag)
      const exportPath = toApiExportPath(tag)

      const existingService = context.findDefinition({ name: serviceName, exportPath })

      if (existingService && !(existingService.value instanceof AspnetServiceInterface)) {
        throw new Error(
          `@skmtc/gen-csharp-aspnet: found a definition named '${serviceName}' at ` +
            `'${exportPath}' that is not a service interface — name collision, or two ` +
            `copies of the generator module are loaded`
        )
      }

      const service =
        existingService?.value instanceof AspnetServiceInterface
          ? existingService.value
          : defineAndRegister(context, {
              identifier: createInterface(serviceName),
              value: new AspnetServiceInterface({ context }),
              destinationPath: exportPath
            }).value

      const existingController = context.findDefinition({ name: controllerName, exportPath })

      if (existingController && !(existingController.value instanceof AspnetControllerClass)) {
        throw new Error(
          `@skmtc/gen-csharp-aspnet: found a definition named '${controllerName}' at ` +
            `'${exportPath}' that is not a controller — name collision, or two copies of ` +
            `the generator module are loaded`
        )
      }

      const controller =
        existingController?.value instanceof AspnetControllerClass
          ? existingController.value
          : defineAndRegister(context, {
              identifier: createClass(controllerName),
              value: new AspnetControllerClass({
                context,
                serviceName,
                destinationPath: exportPath
              }),
              destinationPath: exportPath
            }).value

      const method = new AspnetApiMethod({ context, operation, destinationPath: exportPath })

      service.add(method.serviceSignature)
      controller.add(method.controllerSignature)
    }
  })
}
