import type { OasSchema } from '@skmtc/core'

/** hash of a schema's canonical JSON → shared model class name */
export type SharedHashes = Map<string, string>

/**
 * Canonical-JSON identity for shared-model matching (§C5): the
 * resolved schema's JSON form with object keys sorted. Two inline
 * occurrences of the same structure hash equal.
 */
export const toStructuralHash = (schema: OasSchema): string => {
  return canonicalize(schema.toJsonSchema({ resolve: true }))
}

const canonicalize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`)

    return `{${entries.join(',')}}`
  }

  return JSON.stringify(value)
}
