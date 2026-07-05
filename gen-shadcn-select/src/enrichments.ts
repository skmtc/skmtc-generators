import * as v from 'valibot'
import { moduleSelect } from '@skmtc/core'

// The cell-formatter binding CONTRACT: a candidate fits when it accepts the
// cell's (normalized) value — display components, NOT the form's lens inputs.
// Declared on the moduleSelect; the editor's matcher inlines it to narrow
// candidates via `typeof Candidate extends FormatterModule<FieldType>`.
export const formatterModuleType = `type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date
type Normalize<T> = [T] extends [Primitive]
  ? NonNullable<T>
  : T extends ReadonlyArray<infer U>
    ? Array<Normalize<U>>
    : { [K in keyof T]?: Normalize<NonNullable<T[K]>> }

export type FormatterModule<F> = (props: { value: Normalize<F> }) => unknown`

// Per-input override for the standalone select component, one binding unit:
// `schemaPath` picks the option value off the list item, the optional
// `module` references a consumer-side option renderer.
export const inputItem = v.object({
  moduleSelect: v.pipe(moduleSelect(formatterModuleType), v.title('Formatter'))
})

export type InputItem = v.InferOutput<typeof inputItem>

// The subject-scoped leaf — the per-operation select override.
export const inputSchema = v.optional(
  v.object({
    input: inputItem
  })
)

// The three-scope enrichment umbrella. This generator only consumes the
// subject scope; `generator` / `stack` are unused (declared `v.undefined()`).
export const enrichmentSchema = v.object({
  subject: inputSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema

// A schemaPath may lead with a target token (the editor writes target-first
// paths); the property segments follow it.
const PATH_TARGETS = ['RequestBody', 'SuccessResponse', 'Model']
export const toProperties = (schemaPath: string[]): string[] =>
  schemaPath.length > 0 && PATH_TARGETS.includes(schemaPath[0])
    ? schemaPath.slice(1)
    : schemaPath

