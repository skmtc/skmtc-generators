/**
 * Scalar / format → Kotlin type mapping for `gen-kotlin`.
 *
 * Keyed on the `format` field of an `OasString` (OpenAPI formats like
 * `'date-time'`; GraphQL custom scalar names arrive the same way).
 *
 * Defaults are conservative: every well-known string format maps to
 * `String` except `binary` (→ `ByteArray`); unknown format keys also map
 * to `String` (Kotlin has no `unknown`-style nudge type — configure the
 * map for custom scalars). Override via
 * `toKotlinEntry({ scalars: { 'date-time': 'kotlinx.datetime.Instant' } })`
 * — a DOTTED value renders its simple name and registers the import
 * (`import kotlinx.datetime.Instant`); the consumer adds the library
 * (e.g. `kotlinx-datetime`, whose types are natively `@Serializable`).
 *
 * Module-level mutable state (the gen-typescript precedent): one
 * generation per process, fresh Worker per run.
 */

const defaults: Record<string, string> = {
  'date-time': 'String',
  'date': 'String',
  'time': 'String',
  'email': 'String',
  'uri': 'String',
  'url': 'String',
  'uuid': 'String',
  'hostname': 'String',
  'ipv4': 'String',
  'ipv6': 'String',
  'binary': 'ByteArray',
  'byte': 'String',
  'password': 'String',
  'id': 'String'
}

let scalarMap: Record<string, string> = { ...defaults }

/**
 * Look up the configured Kotlin type for a `format` key. Returns
 * `undefined` when `format` is absent; `'String'` for unrecognized keys.
 */
export const getCustomScalar = (format: string | undefined): string | undefined => {
  if (format === undefined) return undefined
  if (format in scalarMap) return scalarMap[format]
  return 'String'
}

/**
 * Configure the scalar map — merges on top of defaults, or replaces them
 * entirely with `{ replace: true }`.
 */
export const setCustomScalars = (
  scalars: Record<string, string>,
  options: { replace?: boolean } = {}
): void => {
  scalarMap = options.replace ? { ...scalars } : { ...scalarMap, ...scalars }
}

/** Restores the scalar map to defaults. Primarily useful in tests. */
export const resetCustomScalars = (): void => {
  scalarMap = { ...defaults }
}

/** Returns a snapshot of the current scalar map. For inspection / tests. */
export const getCustomScalarMap = (): Readonly<Record<string, string>> => {
  return { ...scalarMap }
}
