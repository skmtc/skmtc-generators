import type { GenerateContextType, ModelProjectionArgs, OasSchema, RefName } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { match, P } from 'ts-pattern'
import { TypeDefinitionBase, type TypeDefinitionOptions } from '../base.ts'
import type { EnrichmentSchema } from '../enrichments.ts'
import { DocumentSchema } from './DocumentSchema.ts'
import { ExternalDocs } from './ExternalDocs.ts'
import { Heading } from './Heading.ts'
import { Schema } from './Schema.ts'
import { TypeTitle } from './ComponentName.ts'

/**
 * A referenced type's definition, in a document that links to it:
 * `### SimpleUser` (with the anchor its links land on) over the type's rows,
 * then its external docs. The rows are a {@link DocumentSchema}, so a type
 * the rows link to is defined in the same document in turn.
 */
export class TypeDefinition extends TypeDefinitionBase {
  blocks: List<(Heading | DocumentSchema | ExternalDocs)[], '\n\n', 'none'>

  constructor(args: ModelProjectionArgs<EnrichmentSchema, TypeDefinitionOptions>) {
    super(args)

    const { context, refName, settings } = args
    const resolved = context.resolveSchemaRefOnce(refName).resolve()
    const externalDocs = match(resolved)
      .with({ type: P.union('object', 'union') }, schema => schema.externalDocs)
      .otherwise(() => undefined)

    this.blocks = new List<(Heading | DocumentSchema | ExternalDocs)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 3, text: new TypeTitle({ context, refName }) }),
        new DocumentSchema({
          context,
          schema: toTypeRows({ context, refName, resolved }),
          documentPath: settings.exportPath
        }),
        externalDocs !== undefined ? new ExternalDocs({ context, externalDocs }) : undefined
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
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
  /** What the type's `$ref` resolves to. */
  resolved: OasSchema
}

/** The rows of the type `refName` in this run: built on first use, then shared. */
const toTypeRows = ({ context, refName, resolved }: ToTypeRowsArgs): Schema => {
  const rows = typeRows.get(context) ?? new Map<RefName, Schema>()
  const schema = rows.get(refName) ?? new Schema({ context, name: undefined, schema: resolved, required: undefined })

  rows.set(refName, schema)
  typeRows.set(context, rows)

  return schema
}
