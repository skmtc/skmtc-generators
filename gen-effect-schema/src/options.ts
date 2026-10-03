/**
 * The caller options this projection accepts, on `insertModel` and on a
 * `$ref` followed under `coerce` (EffectRef).
 *
 * `{ coerce: true }` asks for the target's string-decoding twin — number,
 * boolean and array leaves read as a URL carries them — named
 * `<Target>FromString` in a file of its own. Only `true`, never `false`:
 * options are identity, and one spelling per reading is what keeps a
 * cache hit's options equal to the call's.
 *
 * Reachable only through a named model: core's inline branch of
 * `insertNormalizedModel` calls `schemaToValueFn` without the caller's
 * options, so an inline object asked for with `{ coerce: true }` is built
 * as the JSON reading, silently. A peer that needs one (a route's query
 * parameters, say) builds an `EffectObject` with `coerce: true`.
 */
export type EffectSchemaOptions = { coerce: true } | undefined

/** The options for a reading: the twin under `coerce`, none for JSON. */
export const toOptions = (coerce: boolean): EffectSchemaOptions =>
  coerce ? { coerce: true } : undefined

/**
 * Reserved: a component named with it would share the twin of its
 * prefix's name and file, and the engine reports that as a definition
 * mismatch that names neither.
 */
export const COERCE_SUFFIX = 'FromString'

/** The suffix for a reading: `FromString` under `coerce`, nothing for JSON. */
export const coerceSuffix = (options: EffectSchemaOptions): string =>
  options?.coerce ? COERCE_SUFFIX : ''

export const assertNotReserved = (name: string, refName: string): void => {
  if (name.endsWith(COERCE_SUFFIX)) {
    throw new Error(
      `${refName} ends in ${COERCE_SUFFIX}, which gen-effect-schema reserves for the coerced twin of ${
        name.slice(0, -COERCE_SUFFIX.length)
      }. Rename the component.`,
    )
  }
}
