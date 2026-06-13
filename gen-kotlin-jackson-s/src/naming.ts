/**
 * `equipmentReason` → `EQUIPMENT_REASON`; non-alphanumerics become
 * underscores (`card.created` → `CARD_CREATED`); digit-leading wire
 * values get a `_` prefix (`2_DAY` → `_2_DAY`).
 */
export const toConstantCase = (value: string): string => {
  const constant = value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]/g, '_')
    .toUpperCase()

  return /^[0-9]/.test(constant) ? `_${constant}` : constant
}

/** `references` → `references`; `Agency` → `agency` (the `from(x)` parameter name). */
export const decapitalize = (value: string): string => {
  return value.charAt(0).toLowerCase() + value.slice(1)
}

/**
 * Minimal English singularization for list-element names
 * (`agencies` → `agency`, `stopTimes` → `stopTime`). Deliberately a
 * heuristic, not an engine — if a corpus target breaks it, the fix is
 * an enrichment override, not more rules (the §A2 classStem stance).
 */
export const toSingular = (name: string): string => {
  if (name.endsWith('ies')) {
    return `${name.slice(0, -3)}y`
  }

  if (name.endsWith('s') && !name.endsWith('ss')) {
    return name.slice(0, -1)
  }

  return name
}
