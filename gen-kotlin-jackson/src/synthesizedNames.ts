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
 *   the inline schema to a component — belongs to the schema author);
 * - name already claimed by a DIFFERENT schema position → **throw**
 *   (same reasoning: refusing to emit is honest, emitting the wrong
 *   type is not);
 * - name claimed by the SAME position → `'reuse'` (a legitimate
 *   re-walk; the declaration already exists — package-wide, so this
 *   holds even when the re-walk targets a different file);
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
