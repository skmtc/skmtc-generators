import { isKtIdentifierName, ktHardKeywords } from '@skmtc/lang-kotlin'

/**
 * The Kotlin package generated `<Tag>Api` interfaces land in — REQUIRED,
 * set once per run via `toKotlinSpringEntry({ basePackage })`. Module-level
 * mutable state (the gen-kotlin precedent): generation runs in a fresh
 * Worker per run, so this is per-run-safe.
 *
 * There is deliberately NO default. The package may equal or differ from
 * gen-kotlin's `basePackage`: same package → DTO references render bare
 * (same-package suppression); different package → the Driver-registered
 * `@/`-path imports re-key to dotted packages at render — both correct by
 * the existing machinery.
 */
let basePackage: string | undefined

/** Set the base package, validating each segment up front. */
export const setBasePackage = (value: string): void => {
  for (const segment of value.split('.')) {
    if (!isKtIdentifierName(segment) || ktHardKeywords.has(segment)) {
      throw new Error(
        `@skmtc/gen-kotlin-spring: basePackage '${value}' is not a valid Kotlin package name — ` +
          `segment '${segment}' is not a valid package name part`
      )
    }
  }

  basePackage = value
}

/** Read the base package; throws when the entry was never constructed. */
export const getBasePackage = (): string => {
  if (basePackage === undefined) {
    throw new Error(
      `@skmtc/gen-kotlin-spring: basePackage is not set — construct the entry with ` +
        `toKotlinSpringEntry({ basePackage: 'com.example.api' })`
    )
  }

  return basePackage
}

/** Restores the unset state. Primarily useful in tests. */
export const resetBasePackage = (): void => {
  basePackage = undefined
}
