import type { GenerateContextType } from '@skmtc/core'
import { getModelConfig } from '@/modelConfig.ts'

/** `OnebusawaySdkInvalidDataException` — the SDK's invalid-data exception class name. */
export const exceptionName = (context: GenerateContextType): string => {
  const config = getModelConfig(context)

  return `${config.clientPrefix}InvalidDataException`
}

export const requiredThrows = (context: GenerateContextType): string =>
  `@throws ${exceptionName(context)} if the JSON field has an unexpected type or is unexpectedly missing or null (e.g. if the server responded with an unexpected value).`

export const optionalThrows = (context: GenerateContextType): string =>
  `@throws ${exceptionName(context)} if the JSON field has an unexpected type (e.g. if the server responded with an unexpected value).`
