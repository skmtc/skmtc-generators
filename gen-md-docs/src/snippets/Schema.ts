import {
  camelCase,
  SnippetBase,
  type GenerateContextType,
  type OasSchema,
  type OasRef,
  type OasObject,
  type RefName
} from '@skmtc/core'
import { Name } from './Name.ts'
import { TypeInfo } from './TypeInfo.ts'
import { ExternalDocs } from './ExternalDocs.ts'
import { safeResolve } from '../safeResolve.ts'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

type SchemaArgs = {
  context: GenerateContextType
  name: string | undefined
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
  /** An external description (e.g. a parameter's), used in place of the schema's own when present. */
  description?: string
  /** Collector for the `$ref` types referenced here — see {@link Definitions}. */
  definitions?: Definitions
  depth?: number
}

/**
 * Renders one schema node as a Markdown row, delegating any container's children
 * to a nested {@link Properties} — the counterpart of the docs viewer's
 * recursive `Schema`.
 *
 * A `$ref` renders as a leaf by its name and is **registered** with
 * {@link Definitions}, which renders each referenced type once in a shared
 * "Referenced types" section of the same document. Inline (anonymous) schemas
 * have no name to reference, so they expand in place.
 */
export class Schema extends SnippetBase {
  content: Loop

  constructor({
    context,
    name,
    schema,
    required,
    description,
    definitions = new Definitions({ context }),
    depth = 0
  }: SchemaArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolved = safeResolve(schema)
    const properties = toExpansion(schema, definitions)
    const ownDescription =
      resolved !== undefined && 'description' in resolved ? resolved.description : undefined

    const row = new Loop(
      [
        new Name({ context, name }).content,
        new TypeInfo({ context, schema, required }),
        new Maybe(
          resolved,
          r => new Maybe('title' in r ? r.title : undefined, title => new Wrap(['_', title, '_']))
        ),
        new Maybe((description ?? ownDescription)?.trim(), text => new Wrap(['— ', text]))
      ],
      { separator: ' ' }
    )

    this.content = new Loop(
      [
        row,
        new Maybe(
          properties.length > 0,
          () => new Properties({ context, properties, definitions, depth })
        )
      ],
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}

type Property = {
  name: string | undefined
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
}

type PropertiesArgs = {
  context: GenerateContextType
  properties: Property[]
  definitions: Definitions
  depth: number
}

/**
 * Renders a container's children as an indented bullet list, one nested
 * {@link Schema} per property — the recursion holder, mirroring
 * gen-typescript's `TsObjectProperties`. Threads {@link Definitions} so nested
 * `$ref`s register.
 */
class Properties extends SnippetBase {
  content: Loop

  constructor({ context, properties, definitions, depth }: PropertiesArgs) {
    super({ context })

    const indent = '  '.repeat(depth)

    this.content = new Loop(
      properties.map(
        property =>
          new Wrap([
            indent,
            '- ',
            new Schema({ context, ...property, definitions, depth: depth + 1 })
          ])
      ),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}

/**
 * The child property specs of a schema node — an object's own properties, an
 * array's (flattened) item properties, a union's members. A `$ref` is a leaf:
 * it registers with {@link Definitions} (so its type is defined once, later) and
 * contributes no inline children. Empty for a scalar leaf too.
 */
const toExpansion = (
  schema: OasSchema | OasRef<'schema'>,
  definitions: Definitions
): Property[] => {
  if (schema.isRef()) {
    if (safeResolve(schema) !== undefined) {
      definitions.add(schema)
    }

    return []
  }

  switch (schema.type) {
    case 'object':
      return [...toObjectProperties(schema), ...toAdditionalProperties(schema)]
    case 'array':
      return toExpansion(schema.items, definitions)
    case 'union':
      return schema.members.map(member => ({
        name: undefined,
        schema: member,
        required: undefined
      }))
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
    case 'unknown':
      return []
    default: {
      const exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${JSON.stringify(exhaustive)}`)
    }
  }
}

const toObjectProperties = (object: OasObject): Property[] =>
  Object.entries(object.properties ?? {}).flatMap(([name, schema]) =>
    schema.type === 'custom' ? [] : [{ name, schema, required: object.required?.includes(name) }]
  )

/** A map's value type, as an `«additional properties»` row, when it is a schema (not a boolean). */
const toAdditionalProperties = (object: OasObject): Property[] =>
  object.additionalProperties !== undefined && typeof object.additionalProperties !== 'boolean'
    ? [
        {
          name: '«additional properties»',
          schema: object.additionalProperties,
          required: undefined
        }
      ]
    : []

/**
 * Collects the `$ref` types referenced across one document and renders each of
 * them once, in a "Referenced types" section. A referenced type's own `$ref`s
 * register in turn ({@link build} drains the queue to a fixpoint), so a
 * recursive schema is defined once and its self-reference reads as a name — no
 * loop, no repetition.
 */
export class Definitions extends SnippetBase {
  private seen: Set<RefName> = new Set()
  private queue: OasRef<'schema'>[] = []
  private entries: Loop<TypeDefinition>
  content: Maybe<Loop<TypeDefinition>, Wrap>

  constructor({ context }: DefinitionsArgs) {
    super({ context })

    this.entries = new Loop([], { separator: '\n\n' })
    this.content = new Maybe(this.entries, loop => new Wrap(['## Referenced types\n\n', loop]))
  }

  add(ref: OasRef<'schema'>): void {
    const name = ref.toRefName()

    if (!this.seen.has(name)) {
      this.seen.add(name)
      this.queue.push(ref)
    }
  }

  /** Render every queued type — resolving each may register more, so drain to empty. */
  build(): void {
    let next = this.queue.shift()

    while (next !== undefined) {
      this.entries.add(new TypeDefinition({ context: this.context, ref: next, definitions: this }))
      next = this.queue.shift()
    }
  }

  override toString(): string {
    return `${this.content}`
  }
}

type DefinitionsArgs = {
  context: GenerateContextType
}

type TypeDefinitionArgs = {
  context: GenerateContextType
  ref: OasRef<'schema'>
  definitions: Definitions
}

/** One entry in the {@link Definitions} section: `### Name` over the resolved type's shape. */
class TypeDefinition extends SnippetBase {
  content: Loop

  constructor({ context, ref, definitions }: TypeDefinitionArgs) {
    super({ context, stackTrail: ref.stackTrail.clone() })

    const resolved = safeResolve(ref)

    this.content = new Loop(
      [
        new Wrap(['### ', camelCase(ref.toRefName(), { upperFirst: true })]),
        new Maybe(
          resolved,
          schema =>
            new Schema({ context, name: undefined, schema, required: undefined, definitions })
        ),
        new Maybe(
          resolved,
          schema =>
            new ExternalDocs({
              context,
              externalDocs: 'externalDocs' in schema ? schema.externalDocs : undefined
            }).content
        )
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}
