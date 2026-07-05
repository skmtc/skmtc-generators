import { collateExamples, type OasSchema, type OasRef } from '@skmtc/core'

/**
 * Collate an example value from a schema; a collation failure is logged and
 * skipped (fail open). `console.warn` because `GenerateContextType` exposes no
 * logger; the worker's console reaches the CLI output.
 */
export const toExample = (schema: OasSchema | OasRef<'schema'> | undefined): unknown => {
  if (!schema) {
    return undefined
  }

  try {
    return collateExamples({ objectSchema: schema, depth: 0 })
  } catch (error) {
    console.warn(
      `@skmtc/gen-md-docs: could not collate example — ${
        error instanceof Error ? error.message : String(error)
      }`
    )

    return undefined
  }
}
