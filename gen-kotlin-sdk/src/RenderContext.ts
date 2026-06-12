/**
 * Rendering context threaded through every section Snippet: the base
 * package (for import registration), the exception prefix
 * (`OnebusawaySdk` → `OnebusawaySdkInvalidDataException`), and the
 * envelope class name + field order for `toResponseWrapper()`.
 */
export type RenderContext = {
  basePackage: string
  exceptionPrefix: string
  /** Absent on targets without a response envelope. */
  envelope?: { className: string; fields: string[] }
}

export const requiredThrows = (context: RenderContext): string =>
  `@throws ${context.exceptionPrefix}InvalidDataException if the JSON field has an unexpected type or is unexpectedly missing or null (e.g. if the server responded with an unexpected value).`

export const optionalThrows = (context: RenderContext): string =>
  `@throws ${context.exceptionPrefix}InvalidDataException if the JSON field has an unexpected type (e.g. if the server responded with an unexpected value).`
