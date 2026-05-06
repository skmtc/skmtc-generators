/**
 * Scalar / format → TypeScript type mapping for `gen-typescript`.
 *
 * The mapping is keyed on the `format` field of an `OasString`. Both the
 * OpenAPI side (where `format` is `'date-time'`, `'email'`, etc.) and the
 * GraphQL side (where the SKMTC GraphQL parser puts the scalar's name in
 * `format`, e.g. `'DateTime'`, `'JSON'`) flow through the same map.
 *
 * Defaults preserve historical OpenAPI behavior — every well-known
 * format-keyed string still resolves to `string`. Unknown format keys
 * (which is how custom GraphQL scalars arrive) resolve to `unknown` so
 * users get a type-checking nudge to configure the mapping rather than
 * silently emitting plain `string`.
 *
 * The map is module-level mutable state. Code generators are typically
 * invoked once per process so this is safe; if you need parallel
 * generations with different scalar maps in-process, instantiate via
 * {@link toTypescriptEntry} which snapshots the configuration into the
 * insertable.
 */

const defaults: Record<string, string> = {
  // OpenAPI well-known string formats — preserve string mapping.
  'date-time': 'string',
  'date': 'string',
  'time': 'string',
  'email': 'string',
  'uri': 'string',
  'url': 'string',
  'uuid': 'string',
  'hostname': 'string',
  'ipv4': 'string',
  'ipv6': 'string',
  'binary': 'string',
  'byte': 'string',
  'password': 'string',
  // SKMTC GraphQL parser uses these for built-in scalars that map to
  // string at the wire level.
  'id': 'string'
}

/**
 * Internal state. Reset to `defaults` on every call to
 * {@link setCustomScalars} with `replace: true`.
 */
let scalarMap: Record<string, string> = { ...defaults }

/**
 * Look up the configured TS type for a given `format` key.
 *
 * Returns `undefined` if `format` is not provided. Returns `'unknown'`
 * for unrecognized format keys — the v1 fallback for unknown custom
 * GraphQL scalars (per the survey consensus around `unknown` over `any`).
 */
export const getCustomScalar = (format: string | undefined): string | undefined => {
  if (format === undefined) return undefined
  if (format in scalarMap) return scalarMap[format]
  return 'unknown'
}

/**
 * Configure the scalar map.
 *
 * By default merges the supplied entries on top of the existing map
 * (preserving defaults). Pass `{ replace: true }` to wipe defaults and
 * start fresh.
 *
 * @example
 * setCustomScalars({ DateTime: 'string', JSON: 'unknown', BigInt: 'bigint' })
 */
export const setCustomScalars = (
  scalars: Record<string, string>,
  options: { replace?: boolean } = {}
): void => {
  if (options.replace) {
    scalarMap = { ...scalars }
  } else {
    scalarMap = { ...scalarMap, ...scalars }
  }
}

/**
 * Restores the scalar map to defaults. Primarily useful in tests.
 */
export const resetCustomScalars = (): void => {
  scalarMap = { ...defaults }
}

/**
 * Returns a snapshot of the current scalar map. For inspection / tests.
 */
export const getCustomScalarMap = (): Readonly<Record<string, string>> => {
  return { ...scalarMap }
}
