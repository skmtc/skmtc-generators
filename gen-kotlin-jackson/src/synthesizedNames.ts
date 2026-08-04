import type { GenerateContextType, StackTrail } from '@skmtc/core'
import { toComponentClassNames } from './base.ts'

type ClaimArgs = {
  name: string
  stackTrail: StackTrail
}

/**
 * `'declare'` — first claim on the name: the caller owns it and must
 * `defineAndRegister` the sibling. `'reuse'` — the SAME schema position
 * already declared it (a re-walk): reference the name, declare nothing.
 */
export type SynthesizedNameClaim = 'declare' | 'reuse'

const claimsCache = new WeakMap<object, Map<string, string>>()

const toClaims = (context: GenerateContextType): Map<string, string> => {
  const { document } = context

  const cached = claimsCache.get(document.value)

  if (cached) {
    return cached
  }

  const claims = new Map<string, string>()
  claimsCache.set(document.value, claims)

  return claims
}

/**
 * The collision police for synthesized sibling names. `toSynthesizedName`
 * only answers "what is this position called" — distinct positions can
 * still converge on ONE name (`metaData` and `meta_data` both camelCase
 * to `MetaData`), and every derived name lands in the single package the
 * export-path policy uses, which is Kotlin's actual redeclaration scope.
 * A per-file `findDefinition` probe cannot see either hazard, and a
 * silent probe hit would substitute the FIRST claimant's type for the
 * second's — wrong shape, no error.
 *
 * So every synthesis site claims here, per document (WeakMap-memoized),
 * before declaring:
 *
 * - name collides with a component-derived class name → **throw** (two
 *   files in one package cannot both declare it; the engine isolates the
 *   throw to this subject, and the remedy — rename one side or promote
 *   the inline schema to a component — belongs to the schema author).
 *   `toComponentClassNames` is deliberately FILTER-BLIND: it blocks the
 *   name of every component in the DOCUMENT, including ones a
 *   `skip`/`include` filter keeps out of this run's output. Filters
 *   change run to run; a name that is only free until someone widens a
 *   filter is not free — the same reasoning that makes the
 *   sealed-membership scan filter-blind;
 * - name already claimed by a DIFFERENT schema position → **throw**
 *   (same reasoning: refusing to emit is honest, emitting the wrong
 *   type is not);
 * - name claimed by the SAME position → `'reuse'` (a legitimate
 *   re-walk; the declaration already exists). A `'reuse'` resolves even
 *   when the re-walk targets a DIFFERENT file only because
 *   `toExportPath` hardcodes `BASE_PACKAGE` — one package, no import
 *   needed. These two are a matched pair: making the export path
 *   enrichment-driven or per-model without teaching `'reuse'` to
 *   register a cross-package import turns it into a dangling reference;
 * - otherwise → `'declare'`.
 */
export const claimSynthesizedName = (
  context: GenerateContextType,
  { name, stackTrail }: ClaimArgs,
): SynthesizedNameClaim => {
  // Positional identity. Tracing frames vary per RUN but are constant
  // within one, and claims are per-document — so the full trail is a
  // valid identity here without re-anchoring.
  const trailKey = stackTrail.stackTrail.join('/')

  if (toComponentClassNames(context).has(name)) {
    throw new Error(
      `Synthesized declaration '${name}' (from [${trailKey}]) collides with the component ` +
        `schema of the same class name — both would land in one Kotlin package. Rename the ` +
        `inline schema's key or the component, or promote the inline schema to a component.`,
    )
  }

  const claims = toClaims(context)
  const existing = claims.get(name)

  if (existing === undefined) {
    claims.set(name, trailKey)

    return 'declare'
  }

  if (existing === trailKey) {
    return 'reuse'
  }

  throw new Error(
    `Synthesized declaration '${name}' (from [${trailKey}]) is already claimed by a ` +
      `different schema position [${existing}] — two inline schemas converge to one Kotlin ` +
      `class name. Rename one of the keys.`,
  )
}
