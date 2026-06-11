import { csHardKeywords, isCsIdentifierName } from '@skmtc/lang-csharp'

/**
 * The base C# namespace generated models land in — REQUIRED, set once
 * per run via `toCsharpEntry({ baseNamespace })`. Module-level mutable
 * state (the gen-typescript `scalars` precedent): generation runs in a
 * fresh Worker per run, so this is per-run-safe. The write happens
 * idempotently at the top of `transform`, never at entry construction
 * (the note-30 lesson 1 — closes the cross-test-file race before it
 * exists here).
 *
 * There is deliberately NO default — a silently-wrong `Acme.Api`
 * default helps nobody. The export path encodes the namespace
 * (`@/<baseNamespace dirs>/<Name>.generated.cs`); `CsFile` derives the
 * `namespace` directive from the path; `client.json#settings.basePath`
 * points at the consumer's project source root.
 */
let baseNamespace: string | undefined

/** Set the base namespace, validating each segment up front. Idempotent. */
export const setBaseNamespace = (value: string): void => {
  for (const segment of value.split('.')) {
    if (!isCsIdentifierName(segment) || csHardKeywords.has(segment)) {
      throw new Error(
        `@skmtc/gen-csharp: baseNamespace '${value}' is not a valid C# namespace name — ` +
          `segment '${segment}' is not a valid namespace name part`
      )
    }
  }

  baseNamespace = value
}

/** Read the base namespace; throws when the entry was never constructed. */
export const getBaseNamespace = (): string => {
  if (baseNamespace === undefined) {
    throw new Error(
      `@skmtc/gen-csharp: baseNamespace is not set — construct the entry with ` +
        `toCsharpEntry({ baseNamespace: 'Acme.Api.Models' })`
    )
  }

  return baseNamespace
}

/** Restores the unset state. Primarily useful in tests. */
export const resetBaseNamespace = (): void => {
  baseNamespace = undefined
}
