/**
 * Scalar / format → Kotlin type mapping for `gen-kotlin-kotlinx`.
 *
 * Keyed on the `format` field of an `OasString` (OpenAPI formats like
 * `'date-time'`; GraphQL custom scalar names arrive the same way).
 *
 * Defaults are conservative: every well-known string format maps to
 * `String` except `binary` (→ `ByteArray`); unknown format keys also map
 * to `String` (Kotlin has no `unknown`-style nudge type — configure the
 * map for custom scalars). The map is the `generator`-scope enrichment's
 * `scalars` merged over these defaults ({@link toScalarMap}), threaded
 * from the projection down the value tree — a DOTTED value renders its
 * simple name and registers the import (`import kotlinx.datetime.Instant`;
 * the consumer adds the library, whose types are natively `@Serializable`).
 *
 * No module-level state: the map is per-run config read off
 * `settings.enrichments.generator` and passed by value.
 */
export const scalarDefaults: Record<string, string> = {
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

/** The configured `scalars` (from the `generator` enrichment) merged over
 * the built-in defaults. Computed once in the projection and threaded. */
export const toScalarMap = (
  configured: Record<string, string> | undefined
): Record<string, string> => (configured ? { ...scalarDefaults, ...configured } : scalarDefaults)

/**
 * Look up the configured Kotlin type for a `format` key against a scalar
 * map. Returns `undefined` when `format` is absent; `'String'` for
 * unrecognized keys.
 */
export const getCustomScalar = (
  format: string | undefined,
  scalars: Record<string, string>
): string | undefined => {
  if (format === undefined) return undefined
  if (format in scalars) return scalars[format]
  return 'String'
}
