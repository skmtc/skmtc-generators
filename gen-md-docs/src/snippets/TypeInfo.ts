import { camelCase, SnippetBase, type GenerateContextType, type OasSchema, type OasRef } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Enums } from './Enums.ts'

type TypeInfoArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
}

/**
 * Renders a schema's type annotation and its modifiers — the Markdown
 * counterpart of the docs viewer's `TypeInfo`.
 *
 * Everything is derived from the schema: the display type (a `$ref`'s name,
 * `Item[]` for an array, otherwise the type), the `format` / `nullable` /
 * `required` modifiers (arranged into a space-separated {@link List}), and the
 * allowed values (a composed {@link Enums}). A `$ref`-based type links to its
 * entry in the document's "Referenced types" section (`[`Name`](#name)`), so a
 * reference jumps straight to its definition. Example:
 * `` `string` date-time required (`a`, `b`) ``.
 */
export class TypeInfo extends SnippetBase {
  type: string
  anchor: string | undefined
  modifiers: List
  enums: Enums

  constructor({ context, schema, required }: TypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolved = schema.resolve()
    const nullable = 'nullable' in resolved ? resolved.nullable : undefined

    this.type = toTypeName(schema)
    this.anchor = toRefAnchor(schema)
    this.modifiers = new List(
      [
        'format' in resolved ? resolved.format : undefined,
        nullable === true && 'nullable',
        required === true && 'required'
      ].filter(Boolean),
      { separator: ' ' }
    )
    this.enums = new Enums({
      context,
      enums: 'enums' in resolved ? resolved.enums : undefined
    })
  }

  override toString(): string {
    const type = this.anchor ? `[\`${this.type}\`](#${this.anchor})` : `\`${this.type}\``

    return [type, `${this.modifiers}`, `${this.enums}`].filter(part => part !== '').join(' ')
  }
}

/** The display type: a `$ref`'s name, `Item[]` for an array, otherwise the type. */
const toTypeName = (schema: OasSchema | OasRef<'schema'>): string => {
  if (schema.isRef()) {
    return camelCase(schema.toRefName(), { upperFirst: true })
  }

  const resolved = schema.resolve()

  return resolved.type === 'array' ? `${toTypeName(resolved.items)}[]` : resolved.type
}

/**
 * The heading anchor of the `$ref` this type is built from (a ref, or an array
 * of one), else `undefined`. GitHub lower-cases a heading to form its anchor, so
 * `### SimpleUser` is reachable at `#simpleuser`.
 */
const toRefAnchor = (schema: OasSchema | OasRef<'schema'>): string | undefined => {
  if (schema.isRef()) {
    return camelCase(schema.toRefName(), { upperFirst: true }).toLowerCase()
  }

  const resolved = schema.resolve()

  return resolved.type === 'array' ? toRefAnchor(resolved.items) : undefined
}
