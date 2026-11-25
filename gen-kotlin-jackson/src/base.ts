import { camelCase, fromModelKey } from '@skmtc/core'
import type { GenerateContextType, RefParts } from '@skmtc/core'
import { toKtModelProjectionBase } from '@skmtc/lang-kotlin'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { toModelExportPathInPackage } from './lib.ts'
import { toModelShape } from './shape.ts'

// SLOT(naming): PascalCase from refName ONLY — deterministic, never
// construction-dependent. Kotlin declarations are PascalCase.
const toModelClassName = (refName: string): string => {
  return camelCase(refName, { upperFirst: true })
}

/** The class name of a model: its `name` enrichment, or the name made from its `refName`. */
export const toModelName = (context: GenerateContextType, ref: RefParts): string => {
  const variant = 'main'
  const enrichments = KotlinJacksonBase.toEnrichments({ ref, context, variant })

  return KotlinJacksonBase.toIdentifierName({ ref, enrichments, variant, options: undefined })
}

/**
 * Every class name this generator's export-path policy puts in the one
 * shared package, derived from the document's component schemas and their `name`
 * enrichments —
 * Kotlin's redeclaration scope is the PACKAGE, so a synthesized sibling
 * must be checked against this whole set, not just its own file (see
 * `claimSynthesizedName`). Memoized per run via WeakMap: a pure
 * function of the document and its enrichments, computed before any
 * construction order effects.
 */
const componentClassNamesCache = new WeakMap<GenerateContextType, Set<string>>()

export const toComponentClassNames = (
  context: GenerateContextType,
): Set<string> => {
  const { document } = context

  const cached = componentClassNamesCache.get(context)

  if (cached) {
    return cached
  }

  const refNames = document.type === 'oas'
    ? Object.keys(document.value.components?.schemas ?? {})
    : Object.keys(document.value.registry.schemas)

  const names = new Set(refNames.map((refName) => toModelName(context, fromModelKey(refName))))

  componentClassNamesCache.set(context, names)

  return names
}

export const KotlinJacksonBase = toKtModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,
  // The model's `name` enrichment, or a name from `refName`. `ref.refPath` is
  // passed too and is not read by default.
  toIdentifierName({ ref, enrichments }): string {
    return enrichments.subject?.name ?? toModelClassName(ref.refName)
  },

  // SLOT(identifier-kind): unlike TypeScript, Kotlin's kind depends on the
  // schema's SHAPE (data class vs enum class vs typealias), so this reads
  // context. It runs only on cache-miss; the NAME above stays pure.
  toIdentifierType: (ref, context) => ({
    type: toModelShape(context, ref),
  }),

  // SLOT(export-path): the directory segments ARE the Kotlin package,
  // which comes from the REQUIRED generator-scope basePackage enrichment.
  // Same formula as every synthesized declaration (lib.ts) — the two
  // must never drift.
  // `this` is this base's config, so the file follows the base's own name. A projection
  // that overrides toIdentifierName keeps this file unless it overrides toExportPath too.
  toExportPath({ ref, enrichments, variant }): string {
    return toModelExportPathInPackage(
      enrichments.generator.basePackage,
      this.toIdentifierName({ ref, enrichments, variant }),
    )
  },

  toEnrichmentSchema,
})
