import { toRefName } from '@skmtc/core'
import type { GenerateContextType, OasUnion } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * One consumer-asserted discriminator hint, resolved to its parsed
 * union node (spec 26, decision 1): the consumer declares what the
 * schema author omitted — a `discriminator` (and, for inline unions, a
 * `name`) — and the union flows through the EXISTING sealed machinery.
 *
 * `client.json` shape, under
 * `settings.enrichments["@skmtc/gen-csharp"][refName].main`:
 *
 * ```jsonc
 * // top-level union refName:
 * { "discriminator": { "propertyName": "petType" } }
 * // inline union one level down (the named exclusion: deeper paths):
 * { "properties": { "structure": {
 *     "name": "PricingStructure",
 *     "discriminator": { "propertyName": "pricingType" }
 * } } }
 * ```
 */
export type UnionHint = {
  /** The polymorphic parent's name — the refName for top-level hints,
   * the enrichment-supplied `name` for inline hints. */
  name: string
  /** The asserted `discriminator.propertyName`. */
  propertyName: string
}

type HintMaps = {
  hints: Map<OasUnion, UnionHint>
  /** Hints that failed decision-2 validation, by union node → reason.
   * The rendering site (`CsUnion`) throws the reason — loud per-item
   * manifest error, never a silent fallback. */
  invalid: Map<OasUnion, string>
}

const hintCache = new WeakMap<object, HintMaps>()

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const toPropertyName = (value: unknown): string | undefined => {
  if (!isRecord(value) || !isRecord(value.discriminator)) {
    return undefined
  }

  const { propertyName } = value.discriminator

  return typeof propertyName === 'string' ? propertyName : undefined
}

const toHintMaps = (context: GenerateContextType): HintMaps => {
  const { document } = context

  const cached = hintCache.get(document.value)

  if (cached) {
    return cached
  }

  const maps: HintMaps = { hints: new Map(), invalid: new Map() }
  hintCache.set(document.value, maps)

  const namespace = context.settings?.enrichments?.[denoJson.name]

  if (document.type !== 'oas' || !isRecord(namespace)) {
    return maps
  }

  const schemas = document.value.components?.schemas ?? {}

  for (const [refName, perRef] of Object.entries(namespace)) {
    if (!isRecord(perRef) || !isRecord(perRef.main)) {
      continue
    }

    const schema = schemas[toRefName(refName)]
    const main = perRef.main

    // Top-level union hint: the refName IS the polymorphic parent.
    const topPropertyName = toPropertyName(main)

    if (topPropertyName && schema && !schema.isRef() && schema.type === 'union') {
      maps.hints.set(schema, { name: refName, propertyName: topPropertyName })
    }

    // Inline union hints, one level of `properties.<prop>` (decision 1).
    if (!isRecord(main.properties) || !schema || schema.isRef() || schema.type !== 'object') {
      continue
    }

    for (const [propName, hintValue] of Object.entries(main.properties)) {
      const propertyName = toPropertyName(hintValue)
      const name = isRecord(hintValue) && typeof hintValue.name === 'string' ? hintValue.name : undefined
      const propSchema = schema.properties?.[propName]

      if (!propertyName || !propSchema || propSchema.isRef() || propSchema.type !== 'union') {
        continue
      }

      if (!name) {
        maps.invalid.set(
          propSchema,
          `union hint on '${refName}.properties.${propName}' is missing 'name' — an inline ` +
            `union needs an enrichment-supplied polymorphic parent name`
        )
        continue
      }

      maps.hints.set(propSchema, { name, propertyName })
    }
  }

  return maps
}

/** The valid hint for a parsed union node, if the consumer declared one. */
export const getUnionHint = (
  context: GenerateContextType,
  schema: OasUnion
): UnionHint | undefined => {
  return toHintMaps(context).hints.get(schema)
}

/** The validation-failure reason for a hinted union, if any (set by the
 * membership scan; read by `CsUnion` to fail the item loudly). */
export const getInvalidUnionHint = (
  context: GenerateContextType,
  schema: OasUnion
): string | undefined => {
  return toHintMaps(context).invalid.get(schema)
}

/** Demote a hint that failed decision-2 validation (called by the scan,
 * which owns the member checks). */
export const markInvalidUnionHint = (
  context: GenerateContextType,
  schema: OasUnion,
  reason: string
): void => {
  const maps = toHintMaps(context)

  maps.hints.delete(schema)
  maps.invalid.set(schema, reason)
}
