import type { GenerateContextType, ModelProjectionArgs, OasRef, OasSchema, RefName } from '@skmtc/core'
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

    const { context, refName, settings } = args

    this.blocks = new List<(Heading | TypeContent | PageLink)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 3, text: new TypeTitle({ context, refName }) }),
        isExpandable({ context, refName })
          ? new PageLink({ context, refName, documentPath: settings.exportPath })
          : new TypeContent({ context, refName, documentPath: settings.exportPath })
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
  refName: RefName
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
  constructor({ context, refName, documentPath }: TypeContentArgs) {
    const component =
      context.document.type === 'oas' ? context.document.value.components?.schemas?.[refName] : undefined

    if (component === undefined) {
      throw new Error(`'${refName}' is not one of the document's component schemas`)
    }

    const externalDocs = match(component)
      .with({ type: P.union('object', 'union') }, schema => schema.externalDocs)
      .otherwise(() => undefined)

    super(
      [
        new DocumentSchema({ context, schema: toTypeRows({ context, refName, component }), documentPath }),
        externalDocs !== undefined ? new ExternalDocs({ context, externalDocs }) : undefined
      ],
      { separator: '\n\n' }
    )
  }
}

/**
 * Each run's type rows, by refName. A type's rows depend on no document, and
 * every document that links to a type defines it, so the rows are built once
 * per run and written into each of those documents. Keyed by the run's
 * context, so no rows outlive their run or carry one run's context into
 * another.
 */
const typeRows = new WeakMap<GenerateContextType, Map<RefName, Schema>>()

type ToTypeRowsArgs = {
  context: GenerateContextType
  refName: RefName
  /** The component, as written. */
  component: OasSchema | OasRef<'schema'>
}

/** The rows of the type `refName` in this run: built on first use, then shared. */
const toTypeRows = ({ context, refName, component }: ToTypeRowsArgs): Schema => {
  const rows = typeRows.get(context) ?? new Map<RefName, Schema>()
  const schema = rows.get(refName) ?? new Schema({ context, name: undefined, schema: component, required: undefined })

  rows.set(refName, schema)
  typeRows.set(context, rows)

  return schema
}
