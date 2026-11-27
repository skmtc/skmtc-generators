/**
 * The string formats gen-valibot checks, each with the valibot action that
 * checks it. The list of formats is gen-zod's (`gen-zod/src/formats.ts`).
 *
 * | format      | valibot action     |
 * | ----------- | ------------------ |
 * | `date-time` | `v.isoTimestamp()` |
 * | `date`      | `v.isoDate()`      |
 * | `email`     | `v.email()`        |
 * | `uri`       | `v.url()`          |
 * | `uuid`      | `v.uuid()`         |
 * | `ipv4`      | `v.ipv4()`         |
 * | `ipv6`      | `v.ipv6()`         |
 *
 * Every other format stays `v.string()`. Some of them on purpose:
 *
 * - `duration`: valibot has no check for it.
 * - `uri-template`, `uri-reference`: valibot has no check for them.
 *
 * `date-time` is `v.isoTimestamp()`, not `v.isoDateTime()`: RFC 3339 has
 * seconds and an offset (`2024-05-01T10:00:00Z`), and `v.isoDateTime()`
 * takes only `yyyy-mm-ddThh:mm`, so it refuses every RFC 3339 date-time.
 * `v.uuid()` takes the RFC 4122 layout of hex digits, with no check of the
 * version digit.
 *
 * Each action here is in valibot 1.1.0, the oldest valibot the typecheck task
 * holds.
 *
 * A `Map`, not an object: a format named `constructor` would read
 * `Object.prototype` from an object.
 */
export const formatActions: ReadonlyMap<string, string> = new Map([
  ['date-time', 'isoTimestamp'],
  ['date', 'isoDate'],
  ['email', 'email'],
  ['uri', 'url'],
  ['uuid', 'uuid'],
  ['ipv4', 'ipv4'],
  ['ipv6', 'ipv6']
])
