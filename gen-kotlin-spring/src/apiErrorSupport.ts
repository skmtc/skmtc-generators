import type { GenerateContextType } from '@skmtc/core'
import { toExportPathInPackage } from '@skmtc/gen-kotlin-jackson'
import { createClass, createDataClass, defineAndRegister } from '@skmtc/lang-kotlin'
import { ApiErrorValue } from './ApiErrorValue.ts'
import { ApiErrorHandlerValue } from './ApiErrorHandlerValue.ts'

/**
 * Emit `ApiError` + `ApiErrorHandler` once per run (the accumulator
 * `findDefinition` dedup) into `<basePackage>/ApiError.generated.kt`.
 */
export const ensureApiErrorSupport = (context: GenerateContextType, basePackage: string): void => {
  const exportPath = toExportPathInPackage(basePackage, 'ApiError')

  if (context.findDefinition({ name: 'ApiError', exportPath })) {
    return
  }

  defineAndRegister(context, {
    identifier: createDataClass('ApiError'),
    value: new ApiErrorValue({ context }),
    destinationPath: exportPath
  })

  defineAndRegister(context, {
    identifier: createClass('ApiErrorHandler'),
    value: new ApiErrorHandlerValue({ context, destinationPath: exportPath }),
    destinationPath: exportPath
  })
}
