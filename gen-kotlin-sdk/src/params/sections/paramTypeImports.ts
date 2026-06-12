import type { SdkParam, SdkParamType } from '@/params/SdkParams.ts'

/**
 * The imports a section needs because it PRINTS these params' type
 * expressions — `java.time` for datetimes. Enum classes nest in the
 * Params file and need no import.
 */
export const toParamTypeImports = (params: SdkParam[]): Record<string, string[]> => {
  const datetimes = new Set<string>()

  const visit = (type: SdkParamType): void => {
    switch (type.kind) {
      case 'datetime':
        datetimes.add(type.date === 'local-date' ? 'LocalDate' : 'OffsetDateTime')
        return
      case 'list':
        visit(type.element)
        return
      case 'scalar':
      case 'enum':
        return
      default: {
        const _exhaustive: never = type
        throw new Error(`Unhandled SdkParamType: ${JSON.stringify(_exhaustive)}`)
      }
    }
  }

  params.forEach(param => visit(param.type))

  return datetimes.size ? { 'java.time': [...datetimes].sort() } : {}
}
