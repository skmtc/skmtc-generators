/**
 * The properties of an object value that `v.variant` can switch on (see
 * `ValibotObject.variantKeys`), or none for any other value.
 */
export const toVariantKeys = (value: unknown): string[] =>
  typeof value === 'object' && value !== null && 'variantKeys' in value && Array.isArray(value.variantKeys)
    ? value.variantKeys.filter((key): key is string => typeof key === 'string')
    : []

/**
 * Whether `v.variant` can take a value as an option switched on `key`.
 * valibot types its options as object schemas that hold the key, so a
 * nullable object, a `v.lazy` reference, a model typed `v.GenericSchema<T>`
 * and any other value fail to type-check there.
 */
export const isVariantOption = (value: unknown, key: string): boolean => toVariantKeys(value).includes(key)
