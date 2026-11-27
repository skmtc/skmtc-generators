/**
 * The string formats gen-arktype checks, each with the arktype keyword that
 * checks it. The list of formats is gen-zod's (`gen-zod/src/formats.ts`).
 *
 * | format  | arktype keyword |
 * | ------- | --------------- |
 * | `email` | `string.email`  |
 * | `uri`   | `string.url`    |
 * | `ipv4`  | `string.ip.v4`  |
 * | `ipv6`  | `string.ip.v6`  |
 *
 * Every other format stays `string`. Some of them on purpose:
 *
 * - `date-time`, `date`: `string.date.iso` takes any ISO 8601 form, so it
 *   takes a date alone for a `date-time` and a date-time for a `date`.
 * - `uuid`: `string.uuid` checks RFC 9562's version and variant digits, so it
 *   refuses an id such as `00000000-0000-0000-0000-000000000001`, which is a
 *   valid JSON Schema `uuid`.
 * - `duration`, `uri-template`, `uri-reference`: arktype has no keyword for
 *   them.
 *
 * Each keyword here is in arktype 2.2.3, the arktype the typecheck task holds.
 *
 * A `Map`, not an object: a format named `constructor` would read
 * `Object.prototype` from an object.
 */
export const formatKeywords: ReadonlyMap<string, string> = new Map([
  ['email', 'string.email'],
  ['uri', 'string.url'],
  ['ipv4', 'string.ip.v4'],
  ['ipv6', 'string.ip.v6']
])
