import { sdkConfig as config } from '@/config.ts'

/** `OnebusawaySdkInvalidDataException` — the SDK's invalid-data exception class name. */
export const exceptionName = `${config.clientPrefix}InvalidDataException`

export const requiredThrows = `@throws ${exceptionName} if the JSON field has an unexpected type or is unexpectedly missing or null (e.g. if the server responded with an unexpected value).`

export const optionalThrows = `@throws ${exceptionName} if the JSON field has an unexpected type (e.g. if the server responded with an unexpected value).`
