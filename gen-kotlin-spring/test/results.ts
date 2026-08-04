import { assertEquals } from '@std/assert'
import type { ResultsItem, ResultType } from '@skmtc/core'

/**
 * Every `ResultType` leaf in a manifest's results tree — the VALUES
 * only. The tree's keys are subject paths (`/error-logs:get`) and
 * destination paths (`ApiError.generated.kt`), so matching a substring
 * against the serialized tree reports an error for any document whose
 * own names contain one.
 */
export const toResultTypes = (results: ResultsItem): ResultType[] => {
  return Object.values(results).flatMap(value => {
    if (value === null) {
      return []
    }

    if (typeof value === 'string') {
      return [value]
    }

    if (Array.isArray(value)) {
      return value.flatMap(item => (item === null ? [] : toResultTypes(item)))
    }

    return toResultTypes(value)
  })
}

/**
 * A generate-phase throw never touches `parseIssues` — it lands in
 * `manifest.results.generate` as a per-subject `error`, while the
 * accumulator's already-registered container still renders a
 * valid-but-empty file. Every fixture asserts BOTH channels.
 */
export const assertNoResultErrors = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).filter(result => result === 'error'), [])
}

/** The inverse gate: a run that MUST fail its subjects. */
export const assertHasResultError = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).includes('error'), true)
}
