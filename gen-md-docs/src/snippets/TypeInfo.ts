import {
  camelCase,
  SnippetBase,
  type GenerateContextType,
  type OasSchema,
  type OasRef
} from '@skmtc/core'
import { Enums } from '@/src/snippets/Enums.ts'
import { toConstraints } from '@/src/snippets/Constraints.ts'
import { safeResolve } from '@/src/safeResolve.ts'
import { Loop, Maybe, Wrap } from '@/src/Maybe.ts'

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
 *
 * Each optional part is a `Maybe` keyed on the schema field it reads, so an
 * absent field drops out of the space- or comma-separated `Loop` around it.
 * Type-specific constraints come from {@link toConstraints}, which reads each
 * field from a schema known to have it. The remaining `'field' in schema`
 * checks are annotations that only some members of the `OasSchema` union
 * declare.
 */
export class TypeInfo extends SnippetBase {
  parts: Loop

  constructor({ context, schema, required }: TypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolved = safeResolve(schema)
    const type = toTypeName(schema)
    const anchor = toRefAnchor(schema)

    const modifiers = new Loop(
      [
        new Maybe(
          resolved,
          r =>
            new Loop(
              [
                Maybe.nonEmptyText('format' in r ? r.format : undefined),
                Maybe.when('nullable' in r && r.nullable === true, () => 'nullable')
              ],
              { separator: ' ' }
            )
        ),
        Maybe.when(required === true, () => 'required'),
        new Maybe(
          resolved,
          r =>
            new Loop(
              [
                Maybe.when('deprecated' in r && r.deprecated === true, () => 'deprecated'),
                Maybe.when('readOnly' in r && r.readOnly === true, () => 'read-only'),
                Maybe.when('writeOnly' in r && r.writeOnly === true, () => 'write-only')
              ],
              { separator: ' ' }
            )
        )
      ],
      { separator: ' ' }
    )

    const enums = new Maybe(resolved, r =>
      Maybe.nonEmpty(
        'enums' in r ? r.enums : undefined,
        values => new Enums({ context, enums: values })
      )
    )

    const constraints = new Maybe(resolved, toConstraints)

    this.parts = new Loop(
      [
        Maybe.nonEmptyText(
          anchor,
          a => new Wrap(['[`', type, '`](#', a, ')']),
          () => new Wrap(['`', type, '`'])
        ),
        modifiers,
        enums,
        new Maybe(constraints, c => new Wrap(['(', c, ')']))
      ],
      { separator: ' ' }
    )
  }

  override toString(): string {
    return `${this.parts}`
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
