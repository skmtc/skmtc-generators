import { toOasOperationEntry } from '@skmtc/core'
import { createInterface, defineAndRegister } from '@skmtc/lang-kotlin'
import { setBasePackage } from './basePackage.ts'
import { toApiExportPath, toApiName, toApiTag } from './apiFile.ts'
import { SpringApiInterface } from './SpringApiInterface.ts'
import { SpringApiMethod } from './SpringApiMethod.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Options for {@link toKotlinSpringEntry}.
 */
export type KotlinSpringEntryOptions = {
  /**
   * REQUIRED: the Kotlin package generated `<Tag>Api` interfaces land in
   * (e.g. `'com.example.api'`). Encoded into every export path —
   * `@/<basePackage dirs>/<Name>Api.generated.kt` — so with
   * `client.json#settings.basePath` pointing at the Gradle source root,
   * files land on the package-=-folder convention. May equal or differ
   * from gen-kotlin's `basePackage`. There is deliberately no default.
   */
  basePackage: string
}

/**
 * Factory for the gen-kotlin-spring operation entry. Emits one annotated
 * `interface <Tag>Api` per tag (the openapi-generator "interfaceOnly"
 * pattern — complete output, no stubs): the consumer writes
 * `@RestController class UsersController : UsersApi` and Spring binds the
 * interface-declared annotations. Untagged operations land in
 * `DefaultApi`; a multi-tag operation joins its FIRST tag only.
 *
 * Spring MVC with plain `fun` (no WebFlux/`suspend` in v1); DTOs come
 * from `@skmtc/gen-kotlin` (kotlinx.serialization end-to-end — the
 * documented consumer setup excludes `spring-boot-starter-json` so the
 * kotlinx converter serves responses). Like `toKotlinEntry` there is NO
 * default-config entry export: `basePackage` has no safe default.
 */
export const toKotlinSpringEntry = (options: KotlinSpringEntryOptions) => {
  setBasePackage(options.basePackage)

  return toOasOperationEntry({
    id: denoJson.name,
    transform({ context, operation }) {
      const name = toApiName(toApiTag(operation.tags))
      const exportPath = toApiExportPath(name)

      const existing = context.findDefinition({ name, exportPath })

      const apiInterface =
        existing?.value instanceof SpringApiInterface
          ? existing.value
          : defineAndRegister(context, {
              identifier: createInterface(name),
              value: new SpringApiInterface({ context }),
              destinationPath: exportPath
            }).value

      apiInterface.add(new SpringApiMethod({ context, operation, destinationPath: exportPath }))
    }
  })
}
