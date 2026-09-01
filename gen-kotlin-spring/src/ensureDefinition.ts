import { defineAndRegister } from '@skmtc/lang-kotlin'
import type { KtIdentifier } from '@skmtc/lang-kotlin'
import type { GeneratedValue, GenerateContextType } from '@skmtc/core'

type EnsureDefinitionArgs<Value extends GeneratedValue> = {
  context: GenerateContextType
  identifier: KtIdentifier
  destinationPath: string
  /** The accumulating value's class — the cache holds `unknown` values. */
  valueClass: new (...args: never[]) => Value
  /** Called only on a miss, so the constructor never runs for a reused one. */
  toValue: () => Value
}

/**
 * The accumulator probe: the value already registered at (name, path), or a
 * newly registered one. `defineAndRegister` deliberately skips the cache
 * check — dedup belongs to the caller — and every accumulator then needs the
 * same probe, so it lives here once rather than at each of the three
 * declarations a tag produces.
 *
 * A candidate to promote into @skmtc/lang-kotlin: nothing about it is
 * Spring's.
 */
export const ensureDefinition = <Value extends GeneratedValue>(
  { context, identifier, destinationPath, valueClass, toValue }: EnsureDefinitionArgs<Value>
): Value => {
  const existing = context.findDefinition({ name: identifier.name, exportPath: destinationPath })

  if (existing?.value instanceof valueClass) {
    return existing.value
  }

  return defineAndRegister(context, { identifier, value: toValue(), destinationPath }).value
}
