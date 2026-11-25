import { toModelKey, toRefParts, type GenerateContextType, type OasDocument, type OasRef, type OasSchema, type RefParts } from '@skmtc/core'

type IsExpandableArgs = {
  context: GenerateContextType
  ref: RefParts
}

/**
 * Whether a field of the document can expand to the component schema
 * `ref` names, as Stripe marks it: the field lists the schema in its
 * `x-expansionResources`, and holds either an ID or the whole object.
 *
 * An expandable object is defined on a page of its own (`ObjectPage`), and a
 * document links to that page instead of writing the object out. Expandable
 * objects link to each other, so writing each one into every document that
 * reaches it made each Stripe document about 1 MB. A document without
 * `x-expansionResources` has no expandable objects, so its output is as before.
 */
export const isExpandable = ({ context, ref }: IsExpandableArgs): boolean => {
  if (context.document.type !== 'oas') {
    return false
  }

  const document = context.document.value
  const names = expandables.get(document) ?? toExpandables(document)

  expandables.set(document, names)

  return names.has(toModelKey(ref))
}

/** Each parsed document's expandable objects. */
const expandables = new WeakMap<OasDocument, ReadonlySet<string>>()

/** The schemas the `x-expansionResources` of the document's components name. */
const toExpandables = (document: OasDocument): ReadonlySet<string> =>
  new Set(Object.values(document.components?.schemas ?? {}).flatMap(toExpansionTargets))

/** The schemas `x-expansionResources` names in `schema` and in the schemas written inside it, not through a `$ref`. */
const toExpansionTargets = (schema: OasSchema | OasRef<'schema'>): string[] => [
  ...toRefs(schema.extensionFields?.['x-expansionResources']).map($ref => toModelKey(toRefParts({ $ref }))),
  ...toInnerExpansionTargets(schema)
]

const toInnerExpansionTargets = (schema: OasSchema | OasRef<'schema'>): string[] => {
  switch (schema.type) {
    case 'object':
      return [
        ...Object.values(schema.properties ?? {}).flatMap(property =>
          property.type === 'custom' ? [] : toExpansionTargets(property)
        ),
        ...(schema.additionalProperties !== undefined && typeof schema.additionalProperties !== 'boolean'
          ? toExpansionTargets(schema.additionalProperties)
          : [])
      ]
    case 'array':
      return toExpansionTargets(schema.items)
    case 'union':
      return schema.members.flatMap(toExpansionTargets)
    default:
      return []
  }
}

/** The `$ref`s in an extension's value, which the parser keeps as written. */
const toRefs = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(toRefs)
  }

  if (typeof value !== 'object' || value === null) {
    return []
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    key === '$ref' && typeof entry === 'string' && entry.startsWith('#/components/schemas/') ? [entry] : toRefs(entry)
  )
}
