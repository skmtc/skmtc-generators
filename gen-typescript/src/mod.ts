import { toModelEntry } from '@skmtc/core'
import { TsProjection } from './TsProjection.ts'
import { setCustomScalars } from './scalars.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Options for {@link toTypescriptEntry}.
 */
export type TypescriptEntryOptions = {
  /**
   * Map of `format` keys → emitted TypeScript type strings. Keys are
   * matched against the `format` field on `OasString` schemas.
   *
   * For OpenAPI inputs, the `format` is the standard OpenAPI format
   * (`'date-time'`, `'email'`, …). For GraphQL inputs (parsed via
   * `toGqlDocument`), the `format` is the GraphQL scalar's name
   * (`'DateTime'`, `'JSON'`, custom scalars).
   *
   * Entries supplied here are merged on top of the built-in defaults;
   * pass `replaceScalars: true` to ignore defaults entirely.
   */
  scalars?: Record<string, string>
  /**
   * If true, the supplied `scalars` map replaces the built-in defaults
   * rather than merging on top of them.
   */
  replaceScalars?: boolean
}

/**
 * Factory that returns the gen-typescript model entry, optionally with
 * a configured scalar map.
 *
 * Calling this function applies the scalar configuration globally for
 * the gen-typescript module — typical usage runs a single generation
 * pipeline per process, so this is fine. If you need parallel pipelines
 * with different scalar maps in-process, run them sequentially.
 */
export const toTypescriptEntry = (options: TypescriptEntryOptions = {}) => {
  if (options.scalars !== undefined) {
    setCustomScalars(options.scalars, { replace: options.replaceScalars })
  }
  return toModelEntry({
    id: denoJson.name,
    transform({ context, refName }) {
      context.insertModel(TsProjection, refName)
    }
  })
}

/**
 * Default-config gen-typescript entry. Preserves the legacy export name
 * for backward compatibility — equivalent to `toTypescriptEntry()`.
 */
export const typescriptEntry = toTypescriptEntry()
