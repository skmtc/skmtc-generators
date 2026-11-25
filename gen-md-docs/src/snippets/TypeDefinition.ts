import { isDefaultRefPath, toModelKey, toRefPointer } from '@skmtc/core'
import type { GenerateContextType, ModelProjectionArgs, OasDocument, OasRef, OasSchema, RefParts } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { match, P } from 'ts-pattern'
import { TypeDefinitionBase, type TypeDefinitionOptions } from '../base.ts'
import type { EnrichmentSchema } from '../enrichments.ts'
import { isExpandable } from '../expandable.ts'
import { DocumentSchema } from './DocumentSchema.ts'
import { ExternalDocs } from './ExternalDocs.ts'
import { Heading } from './Heading.ts'
import { PageLink } from './PageLink.ts'
import { Schema } from './Schema.ts'
import { TypeTitle } from './ComponentName.ts'

/**
 * A referenced type's entry, in a document that links to it: `### SimpleUser`
 * (with the anchor its links land on), then the type's {@link TypeContent}.
 * The types the content links to are defined in the same document in turn.
 *
 * An expandable object (see `isExpandable`) has a page of its own, so its
 * entry is a {@link PageLink} to that page instead, and the document does not
 * define the types the object links to.
 */
export class TypeDefinition extends TypeDefinitionBase {
  blocks: List<(Heading | TypeContent | PageLink)[], '\n\n', 'none'>

  constructor(args: ModelProjectionArgs<EnrichmentSchema, TypeDefinitionOptions>) {
    super(args)

    const { context, ref, settings } = args

    this.blocks = new List<(Heading | TypeContent | PageLink)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 3, text: new TypeTitle({ context, ref }) }),
        isExpandable({ context, ref })
          ? new PageLink({ context, ref, documentPath: settings.exportPath })
          : new TypeContent({ context, ref, documentPath: settings.exportPath })
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type TypeContentArgs = {
  context: GenerateContextType
  ref: RefParts
  /** The document the type is written in. */
  documentPath: string
}

/**
 * What a type is: its rows, as a {@link DocumentSchema} in the document, then
 * its external docs. The rows are the component as written: a component that
 * is itself a `$ref` (an alias) shows the link to what it names, which is
 * defined in turn. (`context.resolveSchemaRefOnce` looks one step past the
 * component, which for an alias is what it names.)
 */
export class TypeContent extends List<(DocumentSchema | ExternalDocs)[], '\n\n', 'none'> {
  constructor({ context, ref, documentPath }: TypeContentArgs) {
    const component =
      context.document.type === 'oas' ? toTypeSchema(context.document.value, ref) : undefined

    if (component === undefined) {
      throw new Error(`'${toModelKey(ref)}' is not one of the document's schemas`)
    }

    const externalDocs = match(component)
      .with({ type: P.union('object', 'union') }, schema => schema.externalDocs)
      .otherwise(() => undefined)

    super(
      [
        new DocumentSchema({ context, schema: toTypeRows({ context, ref, component }), documentPath }),
        externalDocs !== undefined ? new ExternalDocs({ context, externalDocs }) : undefined
      ],
      { separator: '\n\n' }
    )
  }
}

/** A type's schema as written: a component, or the target the document keeps under the ref's whole pointer. */
const toTypeSchema = (document: OasDocument, ref: RefParts): OasSchema | OasRef<'schema'> | undefined => {
  if (isDefaultRefPath({ refPath: ref.refPath, refType: 'schema' })) {
    return document.components?.schemas?.[ref.refName]
  }

  const target = document.toRefTarget(toRefPointer(ref))

  if (target?.isRef()) {
    return target.isSchemaRef() ? target : undefined
  }

  return target?.oasType === 'schema' ? target : undefined
}

/**
 * Each run's type rows, by `toModelKey`. A type's rows depend on no document, and
 * every document that links to a type defines it, so the rows are built once
 * per run and written into each of those documents. Keyed by the run's
 * context, so no rows outlive their run or carry one run's context into
 * another.
 */
const typeRows = new WeakMap<GenerateContextType, Map<string, Schema>>()

type ToTypeRowsArgs = {
  context: GenerateContextType
  ref: RefParts
  /** The component, as written. */
  component: OasSchema | OasRef<'schema'>
}

/** The rows of the type `ref` in this run: built on first use, then shared. */
const toTypeRows = ({ context, ref, component }: ToTypeRowsArgs): Schema => {
  const rows = typeRows.get(context) ?? new Map<string, Schema>()
  const schema = rows.get(toModelKey(ref)) ?? new Schema({ context, name: undefined, schema: component, required: undefined })

  rows.set(toModelKey(ref), schema)
  typeRows.set(context, rows)

  return schema
}
