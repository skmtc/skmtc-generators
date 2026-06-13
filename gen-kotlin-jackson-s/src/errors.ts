import { getModelConfig } from '@/modelConfig.ts'

/** `OnebusawaySdkInvalidDataException` — the SDK's invalid-data exception class name. */
export const exceptionName = (): string => {
  const config = getModelConfig()

  return `${config.clientPrefix}InvalidDataException`
}

export const requiredThrows = (): string =>
  `@throws ${exceptionName()} if the JSON field has an unexpected type or is unexpectedly missing or null (e.g. if the server responded with an unexpected value).`

export const optionalThrows = (): string =>
  `@throws ${exceptionName()} if the JSON field has an unexpected type (e.g. if the server responded with an unexpected value).`
