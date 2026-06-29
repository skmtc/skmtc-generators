/**
 * Scalar / format → C# type mapping for `gen-csharp`.
 *
 * Keyed on the `format` field of an `OasString` (OpenAPI formats like
 * `'date-time'`; GraphQL custom scalar names arrive the same way).
 *
 * Defaults are RICH (D12) — unlike Kotlin, the BCL types are natively
 * serializable by System.Text.Json, so temporal/identity formats map to
 * real types out of the box (scratch-proof 4: ISO-8601 / base64 wire
 * shapes round-trip with zero converters). A DOTTED value
 * (`System.Guid`) renders its simple name and registers the namespace
 * using (the gen-kotlin 0.0.9 mechanism, namespace-level). Override via
 * `toCsharpEntry({ scalars })`.
 *
 * Unknown format keys map to `string` and LOG ONCE PER FORMAT (the
 * note-30 lesson) — silent coverage gaps read as "covered" when they
 * are not.
 *
 * Module-level mutable state (the gen-typescript precedent): one
 * generation per process, fresh Worker per run; writes happen
 * idempotently at the top of `transform`.
 */

const defaults: Record<string, string> = {
  'date-time': 'System.DateTimeOffset',
  'date': 'System.DateOnly',
  'time': 'System.TimeOnly',
  'uuid': 'System.Guid',
  'binary': 'byte[]',
  'byte': 'byte[]',
  'email': 'string',
  'uri': 'string',
  'url': 'string',
  'hostname': 'string',
  'ipv4': 'string',
  'ipv6': 'string',
  'password': 'string',
  'id': 'string'
}

let scalarMap: Record<string, string> = { ...defaults }

const loggedUnknownFormats = new Set<string>()

/**
 * Look up the configured C# type for a `format` key. Returns `undefined`
 * when `format` is absent OR unrecognized — the caller falls back to
 * `string` and reports the unrecognized key via
 * {@link logUnknownFormatOnce}.
 */
export const getCustomScalar = (format: string | undefined): string | undefined => {
  if (format === undefined) return undefined

  return format in scalarMap ? scalarMap[format] : undefined
}

/**
 * Log an unrecognized `format` key — once per format per run, so a
 * 500-property schema with a custom format produces one line, not 500.
 * `console.warn` because `GenerateContextType` exposes no logger; the
 * worker's console reaches the CLI output.
 */
export const logUnknownFormatOnce = (format: string): void => {
  if (loggedUnknownFormats.has(format)) {
    return
  }

  loggedUnknownFormats.add(format)
  console.warn(
    `@skmtc/gen-csharp: unrecognized string format '${format}' mapped to 'string' — ` +
      `add it to toCsharpEntry({ scalars }) to pick the type`
  )
}

/**
 * Configure the scalar map — merges on top of defaults, or replaces them
 * entirely with `{ replace: true }`. Idempotent for a fixed input.
 */
export const setCustomScalars = (
  scalars: Record<string, string>,
  options: { replace?: boolean } = {}
): void => {
  scalarMap = options.replace ? { ...scalars } : { ...defaults, ...scalars }
}

/** Restores the scalar map (and the unknown-format log) to defaults. Primarily useful in tests. */
export const resetCustomScalars = (): void => {
  scalarMap = { ...defaults }
  loggedUnknownFormats.clear()
}

/** Returns a snapshot of the current scalar map. For inspection / tests. */
export const getCustomScalarMap = (): Readonly<Record<string, string>> => {
  return { ...scalarMap }
}
