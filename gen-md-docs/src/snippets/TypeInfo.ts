import { SnippetBase, type GenerateContextType, type OasSchema, type OasRef, type RefParts } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Enums } from './Enums.ts'
import {
  ArrayConstraints,
  Constraints,
  NumberConstraints,
  ObjectConstraints,
  StringConstraints
} from './Constraints.ts'
import { UnresolvedMarker } from './Unresolved.ts'
import { ComponentName } from './ComponentName.ts'
import { toSiteSchema } from '../safeResolve.ts'

type TypeNameArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
}

/**
 * The display type of a schema: a `$ref`'s {@link ComponentName}, linked to
 * its definition when it names one (`` [`SimpleUser`](#type-simple-user) ``);
 * `Item[]` for an array, from its items; otherwise the type, as in
 * `` `string` ``. The link lands on the definition in the same document: the
 * `DocumentSchema` the type is written in defines each type in
 * {@link TypeName.links} there.
 */
export class TypeName extends SnippetBase {
  name: string
  /** The anchor of the definition the type links to. */
  anchor: string | undefined
  /** The `$ref` the type ends in names nothing. */
  unresolved: boolean
  /** The component schemas the type links to: its `$ref`'s, when it names one. */
  links: RefParts[]

  constructor({ context, schema }: TypeNameArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    if (schema.isRef()) {
      const component = new ComponentName({ context, ref: schema })
      const resolves = toSiteSchema(schema).type !== 'dangling'

      this.name = component.name
      this.anchor = resolves ? component.anchor : undefined
      this.unresolved = !resolves
      this.links = resolves ? [schema] : []
    } else if (schema.type === 'array') {
      const items = new TypeName({ context, schema: schema.items })

      this.name = `${items.name}[]`
      this.anchor = items.anchor
      this.unresolved = items.unresolved
      this.links = items.links
    } else {
      this.name = schema.type
      this.anchor = undefined
      this.unresolved = false
      this.links = []
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
  /** `undefined` for a type that has no allowed values: a union, an intersection, an unknown. */
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
const toTypeFacets = ({ context, schema, required }: ToTypeFacetsArgs): TypeFacets => {
  switch (schema.type) {
    case 'string':
      return new TypeFacets({
        modifiers: new Modifiers({
          format: schema.format,
          nullable: schema.nullable,
          required,
          deprecated: schema.deprecated,
          readOnly: schema.readOnly,
          writeOnly: schema.writeOnly
        }),
        enums: new Enums({ context, enums: schema.enums ?? [] }),
        constraints: new StringConstraints({ context, schema })
      })
    case 'number':
    case 'integer':
      return new TypeFacets({
        modifiers: new Modifiers({
          format: schema.format,
          nullable: schema.nullable,
          required,
          deprecated: schema.deprecated,
          readOnly: schema.readOnly,
          writeOnly: schema.writeOnly
        }),
        enums: new Enums({ context, enums: schema.enums ?? [] }),
        constraints: new NumberConstraints({ context, schema })
      })
    case 'array':
      return new TypeFacets({
        modifiers: new Modifiers({
          nullable: schema.nullable,
          required,
          deprecated: schema.deprecated,
          readOnly: schema.readOnly,
          writeOnly: schema.writeOnly
        }),
        enums: new Enums({ context, enums: schema.enums ?? [] }),
        constraints: new ArrayConstraints({ context, schema })
      })
    case 'object':
      return new TypeFacets({
        modifiers: new Modifiers({
          nullable: schema.nullable,
          required,
          deprecated: schema.deprecated,
          readOnly: schema.readOnly,
          writeOnly: schema.writeOnly
        }),
        enums: new Enums({ context, enums: schema.enums ?? [] }),
        constraints: new ObjectConstraints({ context, schema })
      })
    case 'boolean':
      return new TypeFacets({
        modifiers: new Modifiers({
          nullable: schema.nullable,
          required,
          deprecated: schema.deprecated,
          readOnly: schema.readOnly,
          writeOnly: schema.writeOnly
        }),
        enums: new Enums({ context, enums: schema.enums ?? [] }),
        constraints: new Constraints({ context, values: [], defaultValue: schema.default })
      })
    case 'union':
    case 'intersection':
      return new TypeFacets({
        modifiers: new Modifiers({ nullable: schema.nullable, required }),
        enums: undefined,
        constraints: new Constraints({ context, values: [], defaultValue: schema.default })
      })
    case 'unknown':
      return new TypeFacets({
        modifiers: new Modifiers({ nullable: schema.nullable, required }),
        enums: undefined,
        constraints: new Constraints({ context, values: [], defaultValue: undefined })
      })
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${Reflect.get(_exhaustive, 'type')}`)
    }
  }
}

type TypeInfoArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  /** What `schema` resolves to. */
  resolved: OasSchema
  required: boolean | undefined
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
  /** The component schemas the annotation links to. */
  links: RefParts[]

  constructor({ context, schema, resolved, required }: TypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const typeName = new TypeName({ context, schema })
    const facets = toTypeFacets({ context, schema: resolved, required })

    this.links = typeName.links

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
}

/**
 * The type annotation of a `$ref` that names nothing: its name, `required`
 * when it is, and the unresolved marker. With no schema behind it, it has no
 * facets or link to show. Example: `` `Missing` required (unresolved $ref) ``.
 */
export class UnresolvedTypeInfo extends SnippetBase {
  annotation: List<(TypeName | string | UnresolvedMarker)[], ' ', 'none'>
  /** The component schemas the annotation links to: none, as its `$ref` names nothing. */
  links: RefParts[]

  constructor({ context, schema, required }: UnresolvedTypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const typeName = new TypeName({ context, schema })

    this.links = typeName.links
    this.annotation = new List(
      [
        typeName,
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

type AliasTypeInfoArgs = {
  context: GenerateContextType
  /** A `$ref` to a component that is itself a `$ref`. */
  schema: OasRef<'schema'> | OasSchema
  required: boolean | undefined
}

/**
 * The type annotation of a `$ref` to an alias (a component that is itself a
 * `$ref`): the link to the alias's definition, and `required` when it is. The
 * facets are those of what the alias names, shown in the alias's definition.
 * Example: `` [`AccountId`](#type-account_id) required ``.
 */
export class AliasTypeInfo extends SnippetBase {
  annotation: List<(TypeName | string)[], ' ', 'none'>
  /** The component schemas the annotation links to: the alias. */
  links: RefParts[]

  constructor({ context, schema, required }: AliasTypeInfoArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const typeName = new TypeName({ context, schema })

    this.links = typeName.links
    this.annotation = new List([typeName, required === true ? 'required' : undefined], { separator: ' ' })
  }

  override toString(): string {
    return `${this.annotation}`
  }
}
