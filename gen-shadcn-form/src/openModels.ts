import type { CustomValue, OasRef, OasSchema } from '@skmtc/core'

/**
 * The models entered on the path from the request body to a field. Each path
 * has its own set, so a model used twice side by side keeps both its fields.
 */
export type OpenModels = ReadonlySet<OasSchema>

type OpenModelArgs = {
  schema: OasRef<'schema'> | OasSchema
  openModels: OpenModels
}

/**
 * `openModels` and the model that `schema` refers to, if it is a reference, or
 * the models its members refer to, if it is an inline intersection, whose
 * fields are theirs.
 */
export const openModel = ({ schema, openModels }: OpenModelArgs): OpenModels => {
  if (schema.isRef()) {
    return new Set(openModels).add(toModel(schema))
  }

  return schema.type === 'intersection'
    ? schema.members.reduce((acc, member) => openModel({ schema: member, openModels: acc }), openModels)
    : openModels
}

type RepeatsModelArgs = {
  schema: OasRef<'schema'> | OasSchema | CustomValue
  openModels: OpenModels
}

/**
 * Whether the field for `schema` would show an open model again. An array
 * repeats the model that its items repeat: its table would have no rows to
 * show. An inline intersection repeats a model that a member refers to.
 */
export const repeatsModel = ({ schema, openModels }: RepeatsModelArgs): boolean => {
  if (schema.type === 'custom') {
    return false
  }

  if (schema.isRef()) {
    if (openModels.has(toModel(schema))) {
      return true
    }

    const target = schema.resolve()

    // A model with the fields of an open one (a subtype of the body) is a model
    // of its own, which can be entered once.
    return target.type === 'intersection' && target.members.length > 1
      ? false
      : repeatsModel({ schema: target, openModels: openModel({ schema, openModels }) })
  }

  if (schema.type === 'array') {
    return repeatsModel({ schema: schema.items, openModels })
  }

  if (schema.type === 'intersection') {
    return schema.members.some(member => repeatsModel({ schema: member, openModels }))
  }

  // `schemaToField` renders a one-member union as its member
  if (schema.type === 'union' && schema.members.length === 1) {
    return repeatsModel({ schema: schema.members[0], openModels })
  }

  return false
}

/**
 * The model a reference ends at. It is the same object for every reference to
 * the model, through an alias or not. `resolve()` instead returns a copy for a
 * reference with keywords next to it.
 */
const toModel = (ref: OasRef<'schema'>): OasSchema => {
  // Throws when the references form a loop, which the walk below would not leave
  ref.resolve()

  const next = ref.resolveOnce()

  return next.isRef() ? toModel(next) : next
}
