import {
  camelCase,
  SnippetBase,
  type GenerateContextType,
  type OasSchema,
  type OasRef
} from '@skmtc/core'
import { Enums } from './Enums.ts'
import { safeResolve } from '../safeResolve.ts'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

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
 * absent field drops out of the space- or comma-separated `Loop` around it. The
 * remaining branches are `'field' in schema` checks: the fields live on only
 * some members of the `OasSchema` union.
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
                new Maybe('format' in r ? r.format : undefined),
                new Maybe('nullable' in r ? r.nullable : undefined, () => 'nullable')
              ],
              { separator: ' ' }
            )
        ),
        new Maybe(required, () => 'required'),
        new Maybe(
          resolved,
          r =>
            new Loop(
              [
                new Maybe('deprecated' in r ? r.deprecated : undefined, () => 'deprecated'),
                new Maybe('readOnly' in r ? r.readOnly : undefined, () => 'read-only'),
                new Maybe('writeOnly' in r ? r.writeOnly : undefined, () => 'write-only')
              ],
              { separator: ' ' }
            )
        )
      ],
      { separator: ' ' }
    )

    const enums = new Enums({
      context,
      enums: resolved !== undefined && 'enums' in resolved ? resolved.enums : undefined
    })

    const constraints = new Maybe(resolved, r => {
      const defaultValue = 'default' in r ? r.default : undefined

      return new Loop(
        [
          new Maybe('minLength' in r ? r.minLength : undefined, v => new Wrap(['min length: ', v])),
          new Maybe('maxLength' in r ? r.maxLength : undefined, v => new Wrap(['max length: ', v])),
          new Maybe('pattern' in r ? r.pattern : undefined, v => new Wrap(['pattern: `', v, '`'])),
          new Maybe(
            'minimum' in r ? r.minimum : undefined,
            v =>
              new Wrap([
                'minimum: ',
                v,
                new Maybe(
                  'exclusiveMinimum' in r ? r.exclusiveMinimum : undefined,
                  () => ' (exclusive)'
                )
              ])
          ),
          new Maybe(
            'maximum' in r ? r.maximum : undefined,
            v =>
              new Wrap([
                'maximum: ',
                v,
                new Maybe(
                  'exclusiveMaximum' in r ? r.exclusiveMaximum : undefined,
                  () => ' (exclusive)'
                )
              ])
          ),
          new Maybe(
            'multipleOf' in r ? r.multipleOf : undefined,
            v => new Wrap(['multiple of: ', v])
          ),
          new Maybe('minItems' in r ? r.minItems : undefined, v => new Wrap(['min items: ', v])),
          new Maybe('maxItems' in r ? r.maxItems : undefined, v => new Wrap(['max items: ', v])),
          new Maybe('uniqueItems' in r ? r.uniqueItems : undefined, () => 'unique items'),
          new Maybe(
            'minProperties' in r ? r.minProperties : undefined,
            v => new Wrap(['min properties: ', v])
          ),
          new Maybe(
            'maxProperties' in r ? r.maxProperties : undefined,
            v => new Wrap(['max properties: ', v])
          ),
          // `false` and `''` are real defaults, so presence is a boolean subject.
          new Maybe(
            defaultValue !== undefined && defaultValue !== null,
            () => new Wrap(['default: `', String(defaultValue), '`'])
          )
        ],
        { separator: ', ' }
      )
    })

    this.parts = new Loop(
      [
        anchor === undefined
          ? new Wrap(['`', type, '`'])
          : new Wrap(['[`', type, '`](#', anchor, ')']),
        modifiers,
        enums.content,
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
