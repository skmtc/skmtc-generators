import { camelCase, SnippetBase, type GenerateContextType, type OasSchema, type OasRef } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Enums } from './Enums.ts'
import { safeResolve } from '../safeResolve.ts'

type TypeInfoArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
}

/**
 * Renders a schema's type annotation, its modifiers and its constraints — the
 * Markdown counterpart of the docs viewer's `TypeInfo`.
 *
 * Everything is derived from the schema: the display type (a `$ref`'s name, with
 * a link to its definition; `Item[]` for an array; otherwise the type), the flag
 * modifiers (`format` / `nullable` / `required` / `deprecated` / `read-only` /
 * `write-only`, space-separated), the allowed values (a composed {@link Enums}),
 * and the validation constraints an agent needs to build a valid value (length,
 * range, `pattern`, item bounds, `default` — a parenthetical group). Example:
 * `` `string` required (min length: 3, pattern: `^[a-z]+$`) ``.
 */
export class TypeInfo extends SnippetBase {
  type: string
  anchor: string | undefined
  modifiers: List
  enums: Enums
  constraints: List

  constructor({ context, schema, required }: TypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolved = safeResolve(schema)
    const nullable = resolved !== undefined && 'nullable' in resolved ? resolved.nullable : undefined

    this.type = toTypeName(schema)
    this.anchor = toRefAnchor(schema)
    this.modifiers = new List(
      [
        resolved !== undefined && 'format' in resolved ? resolved.format : undefined,
        nullable === true && 'nullable',
        required === true && 'required',
        resolved !== undefined && 'deprecated' in resolved && resolved.deprecated === true && 'deprecated',
        resolved !== undefined && 'readOnly' in resolved && resolved.readOnly === true && 'read-only',
        resolved !== undefined && 'writeOnly' in resolved && resolved.writeOnly === true && 'write-only'
      ].filter(Boolean),
      { separator: ' ' }
    )
    this.enums = new Enums({
      context,
      enums: resolved !== undefined && 'enums' in resolved ? resolved.enums : undefined
    })
    this.constraints = new List(resolved !== undefined ? toConstraints(resolved) : [], {
      separator: ', ',
      bookends: '()',
      skipEmpty: true
    })
  }

  override toString(): string {
    const type = this.anchor ? `[\`${this.type}\`](#${this.anchor})` : `\`${this.type}\``

    return [type, `${this.modifiers}`, `${this.enums}`, `${this.constraints}`]
      .filter(part => part !== '')
      .join(' ')
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
    return safeResolve(schema) !== undefined
      ? camelCase(schema.toRefName(), { upperFirst: true }).toLowerCase()
      : undefined
  }

  const resolved = schema.resolve()

  return resolved.type === 'array' ? toRefAnchor(resolved.items) : undefined
}

/** The validation constraints present on a schema, in a stable order. */
const toConstraints = (resolved: OasSchema): (string | undefined)[] => [
  'minLength' in resolved && resolved.minLength !== undefined
    ? `min length: ${resolved.minLength}`
    : undefined,
  'maxLength' in resolved && resolved.maxLength !== undefined
    ? `max length: ${resolved.maxLength}`
    : undefined,
  'pattern' in resolved && resolved.pattern !== undefined
    ? `pattern: \`${resolved.pattern}\``
    : undefined,
  toBound(resolved, 'minimum'),
  toBound(resolved, 'maximum'),
  'multipleOf' in resolved && resolved.multipleOf !== undefined
    ? `multiple of: ${resolved.multipleOf}`
    : undefined,
  'minItems' in resolved && resolved.minItems !== undefined
    ? `min items: ${resolved.minItems}`
    : undefined,
  'maxItems' in resolved && resolved.maxItems !== undefined
    ? `max items: ${resolved.maxItems}`
    : undefined,
  'uniqueItems' in resolved && resolved.uniqueItems === true ? 'unique items' : undefined,
  toDefault(resolved)
]

/** A numeric bound with its exclusivity, e.g. `minimum: 0` or `maximum: 10 (exclusive)`. */
const toBound = (resolved: OasSchema, bound: 'minimum' | 'maximum'): string | undefined => {
  if (bound === 'minimum') {
    if (!('minimum' in resolved) || resolved.minimum === undefined) {
      return undefined
    }

    const exclusive = 'exclusiveMinimum' in resolved && resolved.exclusiveMinimum === true

    return `minimum: ${resolved.minimum}${exclusive ? ' (exclusive)' : ''}`
  }

  if (!('maximum' in resolved) || resolved.maximum === undefined) {
    return undefined
  }

  const exclusive = 'exclusiveMaximum' in resolved && resolved.exclusiveMaximum === true

  return `maximum: ${resolved.maximum}${exclusive ? ' (exclusive)' : ''}`
}

/** The default value, rendered as inline code. */
const toDefault = (resolved: OasSchema): string | undefined =>
  'default' in resolved && resolved.default !== undefined && resolved.default !== null
    ? `default: \`${resolved.default}\``
    : undefined
