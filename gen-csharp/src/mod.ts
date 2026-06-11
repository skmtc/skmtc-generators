import { toModelEntry } from '@skmtc/core'
import { setBaseNamespace } from './baseNamespace.ts'
import { setCustomScalars } from './scalars.ts'
import { toCsProjection } from './toCsProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Options for {@link toCsharpEntry}.
 */
export type CsharpEntryOptions = {
  /**
   * REQUIRED: the C# namespace generated models land in
   * (e.g. `'Acme.Api.Models'`). Encoded into every export path —
   * `@/<baseNamespace dirs>/<Name>.generated.cs` — so with
   * `client.json#settings.basePath` pointing at the consumer's project
   * source root, files land on the folder-=-namespace convention and
   * `CsFile` derives each `namespace` directive from the path. There is
   * deliberately no default.
   */
  baseNamespace: string
  /**
   * Map of `format` keys → emitted C# type names, merged on top of the
   * RICH defaults (D12: `uuid` → `System.Guid`, `date-time` →
   * `System.DateTimeOffset`, `date` → `System.DateOnly`, `time` →
   * `System.TimeOnly`, `binary`/`byte` → `byte[]`). A dotted value
   * renders its simple name and registers the namespace using. Pass
   * `replaceScalars: true` to ignore defaults.
   */
  scalars?: Record<string, string>
  /** If true, `scalars` replaces the built-in defaults instead of merging. */
  replaceScalars?: boolean
}

/**
 * Factory for the gen-csharp model entry. Emits C# DTOs from
 * `components.schemas`: nominal `sealed partial record` for objects,
 * `enum` for string enums — serialization flavor is System.Text.Json
 * attributes with zero consumer dependencies beyond the BCL (D2).
 *
 * Schemas with no C# declaration form (primitives, arrays, maps, empty
 * objects, unions — C# has no exported type alias) produce **no
 * artifact**; ref sites inline the type expression instead (D6, a
 * documented departure from gen-typescript/gen-kotlin full-refName
 * coverage).
 *
 * Unlike `gen-typescript` there is NO default-config entry export:
 * `baseNamespace` has no safe default. Module state is written
 * idempotently at the top of `transform`, never at entry construction
 * (the note-30 lesson 1).
 */
export const toCsharpEntry = (options: CsharpEntryOptions) => {
  return toModelEntry({
    id: denoJson.name,
    transform({ context, refName }) {
      setBaseNamespace(options.baseNamespace)

      if (options.scalars !== undefined) {
        setCustomScalars(options.scalars, { replace: options.replaceScalars })
      }

      const schema = context.resolveSchemaRefOnce(refName, denoJson.name)

      const projection = toCsProjection(schema)

      if (!projection) {
        return
      }

      context.insertModel(projection, refName)
    }
  })
}
