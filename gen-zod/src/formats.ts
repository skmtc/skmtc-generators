/**
 * The string formats gen-zod checks, each with the Zod 4 schema that checks
 * it. #132 gives gen-valibot, gen-arktype and gen-effect-schema checks for
 * the formats of this list. Until then, they do not check the same formats.
 *
 * | format      | Zod 4 schema                        |
 * | ----------- | ----------------------------------- |
 * | `date-time` | `z.iso.datetime({ offset: true })`  |
 * | `date`      | `z.iso.date()`                      |
 * | `duration`  | `z.iso.duration()`                  |
 * | `email`     | `z.email()`                         |
 * | `uri`       | `z.url()`                           |
 * | `uuid`      | `z.guid()`                          |
 * | `ipv4`      | `z.ipv4()`                          |
 * | `ipv6`      | `z.ipv6()`                          |
 *
 * Every other format stays `z.string()`. Some of them on purpose:
 *
 * - `uri-template`, `uri-reference`: Zod 4 has no check for them.
 * - `time`: RFC 3339 `full-time` has an offset, and `z.iso.time()` refuses one.
 *
 * `uuid` is `z.guid()`, not `z.uuid()`: JSON Schema's `uuid` is the RFC 4122
 * layout of hex digits, and `z.uuid()` also checks RFC 9562's version and
 * variant digits, so it refuses an id such as
 * `00000000-0000-0000-0000-000000000001`.
 *
 * Each schema here is in zod 4.1.12, the oldest zod 4 the typecheck task
 * holds. `date-time` passes `offset: true` because RFC 3339 allows an offset
 * such as `+02:00`, and `z.iso.datetime()` refuses one without it.
 *
 * A `Map`, not an object: a format named `constructor` would read
 * `Object.prototype` from an object.
 */
export const formatSchemas: ReadonlyMap<string, string> = new Map([
  ['date-time', 'z.iso.datetime({ offset: true })'],
  ['date', 'z.iso.date()'],
  ['duration', 'z.iso.duration()'],
  ['email', 'z.email()'],
  ['uri', 'z.url()'],
  ['uuid', 'z.guid()'],
  ['ipv4', 'z.ipv4()'],
  ['ipv6', 'z.ipv6()'],
])
