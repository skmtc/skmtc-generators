import { isKtIdentifierName, ktHardKeywords } from '@skmtc/lang-kotlin'

/**
 * The base Kotlin package generated models land in — REQUIRED, set once
 * per run via `toKotlinEntry({ basePackage })`. Module-level mutable
 * state (the gen-typescript `scalars` precedent): generation runs in a
 * fresh Worker per run, so this is per-run-safe.
 *
 * There is deliberately NO default — a silently-wrong `com.example`
 * default helps nobody. The export path encodes the package
 * (`@/<basePackage dirs>/<Name>.generated.kt`); `KtFile` derives the
 * `package` directive from the path; `client.json#settings.basePath`
 * points at the Gradle source root.
 */
let basePackage: string | undefined

/** Set the base package, validating each segment up front. */
export const setBasePackage = (value: string): void => {
  for (const segment of value.split('.')) {
    if (!isKtIdentifierName(segment) || ktHardKeywords.has(segment)) {
      throw new Error(
        `@skmtc/gen-kotlin: basePackage '${value}' is not a valid Kotlin package name — ` +
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
      `@skmtc/gen-kotlin: basePackage is not set — construct the entry with ` +
        `toKotlinEntry({ basePackage: 'com.example.api' })`
    )
  }

  return basePackage
}

/** Restores the unset state. Primarily useful in tests. */
export const resetBasePackage = (): void => {
  basePackage = undefined
}
