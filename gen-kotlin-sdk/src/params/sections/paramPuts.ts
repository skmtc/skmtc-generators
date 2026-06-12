import { toParamTypeExpression, type SdkParam } from '@/params/SdkParams.ts'

export const stringifyParam = (param: SdkParam, expression: string): string => {
  if (param.type.kind === 'datetime') {
    // LocalDate serializes via plain toString; only OffsetDateTime
    // goes through the ISO formatter (corpus evidence).
    return param.type.date === 'local-date'
      ? `${expression}.toString()`
      : `DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(${expression})`
  }

  if (param.type.kind === 'list') {
    // Comma-joined; non-string elements stringify per element (corpus:
    // `transaction_tokens` vs `account_types`).
    const isStringElement =
      param.type.element.kind === 'scalar' && param.type.element.kotlin === 'String'

    return isStringElement
      ? `${expression}.joinToString(",")`
      : `${expression}.joinToString(",") { it.toString() }`
  }

  return param.type.kind === 'scalar' && param.type.kotlin === 'String'
    ? expression
    : `${expression}.toString()`
}

export const renderParamPut = (param: SdkParam): string => {
  return param.required
    ? `put("${param.wireName}", ${stringifyParam(param, param.kotlinName)})`
    : `${param.kotlinName}?.let { put("${param.wireName}", ${stringifyParam(param, 'it')}) }`
}

/** A `put` rendering uses the ISO formatter — the section must import it. */
export const usesDateTimeFormatter = (params: SdkParam[]): boolean => {
  return params.some(
    param => param.type.kind === 'datetime' && param.type.date === 'offset-date-time'
  )
}

export const typeOf = (param: SdkParam): string => toParamTypeExpression(param.type)
