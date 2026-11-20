import { camelCase, SnippetBase, toModelRef, type GenerateContextType, type OasSchema, type OasRef } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { match, P } from 'ts-pattern'
import { Enums } from './Enums.ts'
import {
  ArrayConstraints,
  Constraints,
  NumberConstraints,
  ObjectConstraints,
  StringConstraints
} from './Constraints.ts'
import { UnresolvedMarker } from './Unresolved.ts'
import { safeResolve } from '../safeResolve.ts'
import { TypeDefinition } from './TypeDefinition.ts'

type TypeNameArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  /** The document the type is written in, where a `$ref` it links to is defined. */
  destinationPath: string
}

/**
 * The display type of a schema: a `$ref`'s name, linked to its definition when
 * it names one (`` [`SimpleUser`](#simpleuser) ``); `Item[]` for an array, from
 * its items; otherwise the type, as in `` `string` ``. GitHub lower-cases a
 * heading to form its anchor, so `### SimpleUser` is reachable at `#simpleuser`.
 * The `$ref` it links to is inserted as a {@link TypeDefinition} in the same
 * document: the link and the definition come from that one insert.
 */
export class TypeName extends SnippetBase {
  name: string
  /** The anchor of the definition the type links to. */
  anchor: string | undefined
  /** The `$ref` the type ends in names nothing. */
  unresolved: boolean

  constructor({ context, schema, destinationPath }: TypeNameArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    if (schema.isRef() && safeResolve(schema) !== undefined) {
      const ref = toModelRef({
        context,
        refName: schema.toRefName(),
        destinationPath,
        projection: TypeDefinition,
        options: { documentPath: destinationPath }
      })

      this.name = ref.settings.identifier.name
      this.anchor = this.name.toLowerCase()
      this.unresolved = false
    } else if (schema.isRef()) {
      this.name = camelCase(schema.toRefName(), { upperFirst: true })
      this.anchor = undefined
      this.unresolved = true
    } else if (schema.type === 'array') {
      const items = new TypeName({ context, schema: schema.items, destinationPath })

      this.name = `${items.name}[]`
      this.anchor = items.anchor
      this.unresolved = items.unresolved
    } else {
      this.name = schema.type
      this.anchor = undefined
      this.unresolved = false
    }
  }

  override toString(): string {
    return this.anchor !== undefined ? `[\`${this.name}\`](#${this.anchor})` : `\`${this.name}\``
  }
}

type ModifiersArgs = {
  format?: string
  nullable?: boolean
  required: boolean | undefined
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean
}

/** A schema's format and flags, space-separated: `date-time nullable required read-only`. */
export class Modifiers extends List<string[], ' ', 'none'> {
  constructor({ format, nullable, required, deprecated, readOnly, writeOnly }: ModifiersArgs) {
    super(
      [
        format === '' ? undefined : format,
        nullable === true ? 'nullable' : undefined,
        required === true ? 'required' : undefined,
        deprecated === true ? 'deprecated' : undefined,
        readOnly === true ? 'read-only' : undefined,
        writeOnly === true ? 'write-only' : undefined
      ],
      { separator: ' ' }
    )
  }
}

type TypeFacetsArgs = {
  modifiers: Modifiers
  /** `undefined` for a type that has no allowed values: a union, an unknown. */
  enums: Enums | undefined
  constraints: Constraints
}

/**
 * What a type annotation shows after the type: its modifiers, its allowed
 * values ({@link Enums}) and its {@link Constraints}, each only when it has any.
 */
export class TypeFacets extends List<(Modifiers | Enums | Constraints)[], ' ', 'none'> {
  constructor({ modifiers, enums, constraints }: TypeFacetsArgs) {
    super(
      [modifiers, enums, constraints].filter(group => group !== undefined && group.values.length > 0),
      { separator: ' ' }
    )
  }
}

type ToTypeFacetsArgs = {
  context: GenerateContextType
  schema: OasSchema
  required: boolean | undefined
}

/**
 * The facets of a resolved schema, from its own type's fields: one dispatch on
 * the type, so each type reads only the fields it has.
 */
const toTypeFacets = ({ context, schema, required }: ToTypeFacetsArgs): TypeFacets =>
  match(schema)
    .with(
      { type: 'string' },
      string =>
        new TypeFacets({
          modifiers: new Modifiers({
            format: string.format,
            nullable: string.nullable,
            required,
            deprecated: string.deprecated,
            readOnly: string.readOnly,
            writeOnly: string.writeOnly
          }),
          enums: new Enums({ context, enums: string.enums ?? [] }),
          constraints: new StringConstraints({ context, schema: string })
        })
    )
    .with(
      { type: P.union('number', 'integer') },
      number =>
        new TypeFacets({
          modifiers: new Modifiers({
            format: number.format,
            nullable: number.nullable,
            required,
            deprecated: number.deprecated,
            readOnly: number.readOnly,
            writeOnly: number.writeOnly
          }),
          enums: new Enums({ context, enums: number.enums ?? [] }),
          constraints: new NumberConstraints({ context, schema: number })
        })
    )
    .with(
      { type: 'array' },
      array =>
        new TypeFacets({
          modifiers: new Modifiers({
            nullable: array.nullable,
            required,
            deprecated: array.deprecated,
            readOnly: array.readOnly,
            writeOnly: array.writeOnly
          }),
          enums: new Enums({ context, enums: array.enums ?? [] }),
          constraints: new ArrayConstraints({ context, schema: array })
        })
    )
    .with(
      { type: 'object' },
      object =>
        new TypeFacets({
          modifiers: new Modifiers({
            nullable: object.nullable,
            required,
            deprecated: object.deprecated,
            readOnly: object.readOnly,
            writeOnly: object.writeOnly
          }),
          enums: new Enums({ context, enums: object.enums ?? [] }),
          constraints: new ObjectConstraints({ context, schema: object })
        })
    )
    .with(
      { type: 'boolean' },
      boolean =>
        new TypeFacets({
          modifiers: new Modifiers({
            nullable: boolean.nullable,
            required,
            deprecated: boolean.deprecated,
            readOnly: boolean.readOnly,
            writeOnly: boolean.writeOnly
          }),
          enums: new Enums({ context, enums: boolean.enums ?? [] }),
          constraints: new Constraints({ context, values: [], defaultValue: boolean.default })
        })
    )
    .with(
      { type: 'union' },
      union =>
        new TypeFacets({
          modifiers: new Modifiers({ nullable: union.nullable, required }),
          enums: undefined,
          constraints: new Constraints({ context, values: [], defaultValue: union.default })
        })
    )
    .with(
      { type: 'unknown' },
      unknown =>
        new TypeFacets({
          modifiers: new Modifiers({ nullable: unknown.nullable, required }),
          enums: undefined,
          constraints: new Constraints({ context, values: [], defaultValue: undefined })
        })
    )
    .exhaustive()

type TypeInfoArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  /** What `schema` resolves to. */
  resolved: OasSchema
  required: boolean | undefined
  /** The document the type is written in. */
  destinationPath: string
}

/**
 * Renders a schema's type annotation — the Markdown counterpart of the docs
 * viewer's `TypeInfo`: the {@link TypeName}, then the {@link TypeFacets} an
 * agent needs to build a valid value, then the unresolved marker when the type
 * ends in a `$ref` that names nothing. Example:
 * `` `string` required (min length: 3, pattern: `^[a-z]+$`) ``.
 */
export class TypeInfo extends SnippetBase {
  annotation: List<(TypeName | TypeFacets | UnresolvedMarker)[], ' ', 'none'>

  constructor({ context, schema, resolved, required, destinationPath }: TypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const typeName = new TypeName({ context, schema, destinationPath })
    const facets = toTypeFacets({ context, schema: resolved, required })

    this.annotation = new List(
      [
        typeName,
        facets.values.length > 0 ? facets : undefined,
        typeName.unresolved ? new UnresolvedMarker({ context }) : undefined
      ],
      { separator: ' ' }
    )
  }

  override toString(): string {
    return `${this.annotation}`
  }
}

type UnresolvedTypeInfoArgs = {
  context: GenerateContextType
  /** A `$ref` that names nothing. */
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
  /** The document the type is written in. */
  destinationPath: string
}

/**
 * The type annotation of a `$ref` that names nothing: its name, `required`
 * when it is, and the unresolved marker. With no schema behind it, it has no
 * facets or link to show. Example: `` `Missing` required (unresolved $ref) ``.
 */
export class UnresolvedTypeInfo extends SnippetBase {
  annotation: List<(TypeName | string | UnresolvedMarker)[], ' ', 'none'>

  constructor({ context, schema, required, destinationPath }: UnresolvedTypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    this.annotation = new List(
      [
        new TypeName({ context, schema, destinationPath }),
        required === true ? 'required' : undefined,
        new UnresolvedMarker({ context })
      ],
      { separator: ' ' }
    )
  }

  override toString(): string {
    return `${this.annotation}`
  }
}
