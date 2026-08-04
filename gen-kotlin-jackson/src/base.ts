import { camelCase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import { toKtModelProjectionBase } from '@skmtc/lang-kotlin'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { toModelExportPath } from './lib.ts'
import { toModelShape } from './shape.ts'

// SLOT(naming): PascalCase from refName ONLY — deterministic, never
// construction-dependent. Kotlin declarations are PascalCase. Extracted
// so `toComponentClassNames` below applies the SAME policy — the two
// must never drift.
const toModelClassName = (refName: string): string => {
  return camelCase(refName, { upperFirst: true })
}

/**
 * Every class name this generator's export-path policy puts in the one
 * shared package, derived from the document's component schemas —
 * Kotlin's redeclaration scope is the PACKAGE, so a synthesized sibling
 * must be checked against this whole set, not just its own file (see
 * `claimSynthesizedName`). Memoized per document via WeakMap: a pure
 * function of the document, computed before any construction order
 * effects.
 */
const componentClassNamesCache = new WeakMap<object, Set<string>>()

export const toComponentClassNames = (
  context: GenerateContextType,
): Set<string> => {
  const { document } = context

  const cached = componentClassNamesCache.get(document.value)

  if (cached) {
    return cached
  }

  const refNames = document.type === 'oas'
    ? Object.keys(document.value.components?.schemas ?? {})
    : Object.keys(document.value.registry.schemas)

  const names = new Set(refNames.map(toModelClassName))

  componentClassNamesCache.set(document.value, names)

  return names
}

export const KotlinJacksonBase = toKtModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ refName }): string {
    return toModelClassName(refName)
  },

  // SLOT(identifier-kind): unlike TypeScript, Kotlin's kind depends on the
  // schema's SHAPE (data class vs enum class vs typealias), so this reads
  // context. It runs only on cache-miss; the NAME above stays pure.
  toIdentifierType: (refName, context) => ({
    type: toModelShape(context, refName),
  }),

  // SLOT(export-path): the directory segments ARE the Kotlin package —
  // `@/com/example/models/Order.generated.kt` → `package com.example.models`.
  // Hardcoded: this generator takes no runtime configuration. Delegates
  // to the SAME policy synthesized sealed parents use (lib.ts).
  toExportPath({ refName, enrichments, variant }): string {
    return toModelExportPath(this.toIdentifierName({ refName, enrichments, variant }))
  },

  toEnrichmentSchema,
})
