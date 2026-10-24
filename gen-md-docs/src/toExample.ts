import { collateExamples, type OasSchema, type OasRef } from '@skmtc/core'

/**
 * A collated example, held in an object so that `Maybe` keys on whether an
 * example exists, not on its value: `false`, `''` and `[]` are real examples.
 */
export type CollatedExample = {
  value: unknown
}

/**
 * Collate an example value from a schema; `undefined` when there is none. A
 * collation failure is logged and skipped (fail open). `console.warn` because
 * `GenerateContextType` exposes no logger; the worker's console reaches the CLI
 * output.
 */
export const toExample = (
  schema: OasSchema | OasRef<'schema'> | undefined
): CollatedExample | undefined => {
  if (!schema) {
    return undefined
  }

  try {
    const value = collateExamples({ objectSchema: schema, depth: 0 })

    return value === undefined || value === null ? undefined : { value }
  } catch (error) {
    console.warn(
      `@skmtc/gen-md-docs: could not collate example — ${
        error instanceof Error ? error.message : String(error)
      }`
    )

    return undefined
  }
}
