/**
 * The string formats gen-effect-schema checks, each with the Effect 4 check
 * that checks it. The list of formats is gen-zod's (`gen-zod/src/formats.ts`).
 *
 * | format | Effect 4 check     |
 * | ------ | ------------------ |
 * | `uuid` | `Schema.isGUID()`  |
 *
 * Every other format stays `Schema.String`. Effect 4 has no check that keeps
 * the value a string for `date-time`, `date`, `duration`, `email`, `uri`,
 * `ipv4` or `ipv6`: its schemas for them (`DateTimeUtcFromString`,
 * `Ipv4AddressFromString`) decode the value into another type, and
 * gen-typescript types it as a string.
 *
 * `uuid` is `Schema.isGUID()`, not `Schema.isUUID()`: JSON Schema's `uuid` is
 * the RFC 4122 layout of hex digits, and `Schema.isUUID()` also checks RFC
 * 9562's version digits, so it refuses an id such as
 * `00000000-0000-0000-0000-000000000001`.
 *
 * Each check here is in effect 4.1.4, the effect the typecheck task holds.
 *
 * A `Map`, not an object: a format named `constructor` would read
 * `Object.prototype` from an object.
 */
export const formatChecks: ReadonlyMap<string, string> = new Map([
  ['uuid', 'isGUID']
])
