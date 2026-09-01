import { join } from '@std/path'
import type { GenerateContextType } from '@skmtc/core'
import { createClass, createDataClass, defineAndRegister } from '@skmtc/lang-kotlin'
import { ApiErrorValue } from './ApiErrorValue.ts'
import { ApiErrorHandlerValue } from './ApiErrorHandlerValue.ts'

/**
 * Emit `ApiError` + `ApiErrorHandler` once per run (the accumulator
 * `findDefinition` dedup) into `<basePackage>/ApiError.generated.kt`.
 */
export const ensureApiErrorSupport = (context: GenerateContextType, basePackage: string): void => {
  const exportPath = join('@', ...basePackage.split('.'), 'ApiError.generated.kt')

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
