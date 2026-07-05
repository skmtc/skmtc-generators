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

// Per-column override, one binding unit: `schemaPath` identifies the
// response-item property the column maps to (the accessor path is the
// column's identity — no separate `id`), and the optional `module` points
// the cell at a consumer-side renderer. With no `module`, the cell renders
// the raw value.
export const tableColumnItem = v.object({
  moduleSelect: v.pipe(moduleSelect(formatterModuleType), v.title('Formatter')),
  label: v.string()
})

export type ColumnSchema = v.InferOutput<typeof tableColumnItem>

export const tablePropertiesSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.array(tableColumnItem))
  })
)

// The subject-scoped leaf — the per-operation table override.
export const tableSchema = v.optional(
  v.object({
    table: tablePropertiesSchema
  })
)

// The three-scope enrichment umbrella. This generator only consumes the
// subject scope; `generator` / `stack` are unused (declared `v.undefined()`).
export const enrichmentSchema = v.object({
  subject: tableSchema,
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

