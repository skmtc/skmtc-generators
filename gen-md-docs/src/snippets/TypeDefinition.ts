import type { ModelProjectionArgs } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { match, P } from 'ts-pattern'
import { TypeDefinitionBase, type TypeDefinitionOptions } from '../base.ts'
import type { EnrichmentSchema } from '../enrichments.ts'
import { ExternalDocs } from './ExternalDocs.ts'
import { Heading } from './Heading.ts'
import { Schema } from './Schema.ts'

/**
 * A referenced type's definition, in the document that links to it:
 * `### SimpleUser` over the type's shape, then its external docs. A `$ref`
 * inside the type is defined in the same document in turn; the engine writes
 * each one once, and a reference back to a type still being built reads as a
 * name, so a recursive type is defined once.
 */
export class TypeDefinition extends TypeDefinitionBase {
  blocks: List<(Heading | Schema | ExternalDocs)[], '\n\n', 'none'>

  constructor(args: ModelProjectionArgs<EnrichmentSchema, TypeDefinitionOptions>) {
    super(args)

    const { context, refName, settings } = args
    const resolved = context.resolveSchemaRefOnce(refName).resolve()
    const externalDocs = match(resolved)
      .with({ type: P.union('object', 'union') }, schema => schema.externalDocs)
      .otherwise(() => undefined)

    this.blocks = new List<(Heading | Schema | ExternalDocs)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 3, text: settings.identifier.name }),
        new Schema({
          context,
          name: undefined,
          schema: resolved,
          required: undefined,
          destinationPath: settings.exportPath
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
