import { SnippetBase, toModelKey, toModelRef, type GenerateContextType } from '@skmtc/core'
import { isPageOf } from './ObjectPage.ts'
import type { Schema } from './Schema.ts'
import { TypeDefinition } from './TypeDefinition.ts'

type DocumentSchemaArgs = {
  context: GenerateContextType
  schema: Schema
  /** The document the schema is written in. */
  documentPath: string
}

/**
 * A {@link Schema} written in a document: its rows, with each type they link
 * to inserted as a {@link TypeDefinition} in the same document, under
 * "Referenced types". A type's definition is a `DocumentSchema` too, so the
 * types it links to are defined in turn. The engine writes each type once per
 * document, and a link back to a type still being built finds it pending, so
 * a document holds every type it links to and stays self-contained.
 *
 * On an expandable object's own page (`ObjectPage`), a link to the object
 * lands on the page's heading, so the object is not defined there again.
 */
export class DocumentSchema extends SnippetBase {
  schema: Schema

  constructor({ context, schema, documentPath }: DocumentSchemaArgs) {
    super({ context })

    this.schema = schema

    const links = [...new Map(schema.links.map(ref => [toModelKey(ref), ref])).values()].filter(ref => !isPageOf({ context, ref, documentPath }))

    links.forEach(ref => {
      toModelRef({
        context,
        ref,
        destinationPath: documentPath,
        projection: TypeDefinition,
        options: { documentPath }
      })
    })
  }

  override toString(): string {
    return `${this.schema}`
  }
}
