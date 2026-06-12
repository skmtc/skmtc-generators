/**
 * The KS-C domain model (note 32 §C2, T1): one record per class; every
 * section of the rendered file is a pure function over it. A 720-line
 * Stainless model file is ~12 lines of this data.
 */
export type SdkModel = {
  className: string
  description?: string
  fields: SdkField[]
  /** Top-level response whose fields cover the envelope → gets `toResponseWrapper()`. */
  envelope: boolean
}

export type SdkField = {
  kotlinName: string
  wireName: string
  type: SdkType
  /** Construction axis: `checkRequired`, builder-var form. */
  required: boolean
  /**
   * Wording axis (`@throws` text): `required && !nullable`, or a
   * config `fieldStates` override (corpus: `schedule` is required but
   * nullable → optional wording; `limitExceeded` is overridden →
   * required wording).
   */
  docRequired: boolean
  /** Fence + ordering axis: spec-required or overridden. */
  fenceRequired: boolean
  /**
   * Resolved-schema `nullable: true` — the typed Builder setter takes
   * `T?` via `JsonField.ofNullable` (independent of requiredness).
   */
  nullable: boolean
  description?: string
}

export type SdkScalar = 'Boolean' | 'Long' | 'Int' | 'Double' | 'Float' | 'String'

export type SdkType =
  | { kind: 'scalar'; kotlin: SdkScalar }
  | { kind: 'datetime'; date: 'offset-date-time' | 'local-date' }
  | {
      kind: 'list'
      element: SdkType
      /** Render `kotlin.collections.List` — a sibling nested class named `List` shadows the stdlib type. */
      qualified?: boolean
    }
  | { kind: 'model'; model: SdkModel }
  | { kind: 'enum'; enumModel: SdkEnum }
  | { kind: 'shared'; className: string }

/** The Known/Value enum-class family (rendered nested, like models). */
export type SdkEnum = {
  className: string
  description?: string
  /** Wire values, in spec order. */
  members: string[]
}

/** The Kotlin type expression a field renders with. */
export const toTypeExpression = (type: SdkType): string => {
  switch (type.kind) {
    case 'scalar':
      return type.kotlin
    case 'datetime':
      return type.date === 'local-date' ? 'LocalDate' : 'OffsetDateTime'
    case 'list':
      return `${type.qualified ? 'kotlin.collections.List' : 'List'}<${toTypeExpression(type.element)}>`
    case 'model':
      return type.model.className
    case 'enum':
      return type.enumModel.className
    case 'shared':
      return type.className
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled SdkType: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/**
 * The Stainless field order for component-shaped (nested) classes:
 * doc-required group first, each group ALPHABETICAL by name, with
 * `id` hoisted to the front of the required group. Top-level response
 * classes are NOT sorted — they keep the allOf-merge order (envelope
 * fields, then the payload). Corpus evidence: References.Situation
 * (alphabetical optionals ≠ spec order), Route (id hoisted),
 * CurrentTime top level (data last, not alphabetical).
 */
export const orderSortedFields = (fields: SdkField[], hoistField = 'id'): SdkField[] => {
  // The hoist field jumps to the front of WHICHEVER group it falls
  // into (corpus: Config's GitProperties leads with an optional `id`).
  // WHICH name hoists is per-target Stainless config — the resource
  // primary key (`id` for OneBusAway, `token` for Lithic).
  const byNameHoistFirst = (a: SdkField, b: SdkField) => {
    if (a.kotlinName === hoistField) return -1
    if (b.kotlinName === hoistField) return 1
    return a.kotlinName.localeCompare(b.kotlinName)
  }

  const required = fields.filter(field => field.fenceRequired).sort(byNameHoistFirst)
  const optional = fields.filter(field => !field.fenceRequired).sort(byNameHoistFirst)

  return [...required, ...optional]
}

/**
 * Marks list types `kotlin.collections.List`-qualified wherever a
 * nested class named `List` is in scope (Kotlin name shadowing — the
 * corpus `List<List>` finding). Scope = this class's nested type
 * names plus everything inherited from enclosing classes.
 */
export const applyStdlibShadowing = (model: SdkModel, inherited: Set<string>): SdkModel => {
  const nestedNames = model.fields.flatMap(field => nestedClassNames(field.type))
  const scope = new Set([...inherited, ...nestedNames])
  const shadowed = scope.has('List')

  const fields = model.fields.map(field => ({
    ...field,
    type: rewriteType(field.type, shadowed, scope)
  }))

  return { ...model, fields }
}

const nestedClassNames = (type: SdkType): string[] => {
  switch (type.kind) {
    case 'model':
      return [type.model.className]
    case 'enum':
      return [type.enumModel.className]
    case 'list':
      return nestedClassNames(type.element)
    case 'scalar':
    case 'datetime':
    case 'shared':
      return []
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled SdkType: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

const rewriteType = (type: SdkType, shadowed: boolean, scope: Set<string>): SdkType => {
  switch (type.kind) {
    case 'list':
      return { ...type, qualified: shadowed || undefined, element: rewriteType(type.element, shadowed, scope) }
    case 'model':
      return { ...type, model: applyStdlibShadowing(type.model, scope) }
    case 'enum':
    case 'scalar':
    case 'datetime':
    case 'shared':
      return type
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled SdkType: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/** A type whose values carry their own `validate()` (models, enums, shared). */
export const isValidatable = (type: SdkType): boolean => {
  return type.kind === 'model' || type.kind === 'enum' || type.kind === 'shared'
}

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
 * Minimal English singularization for list-element class names
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
