import {
  camelCase,
  toModelProjectionBase,
  toOasOperationProjectionBase,
  type IdentifierType
} from '@skmtc/core'
import { MdSnippet } from './lang/MdSnippet.ts'
import { toDocsExportPath } from './paths.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** The options a referenced type is inserted with. */
export type TypeDefinitionOptions = {
  /** The document that links to the type, where its definition is written. */
  documentPath: string
}

/**
 * The base of an operation's document: one Markdown file per operation, at its
 * docs path. Method and path name it, so no component schema's name can
 * collide with it.
 */
export const OperationDocBase = toOasOperationProjectionBase<EnrichmentSchema>(MdSnippet, {
  id: denoJson.name,
  toIdentifierName: ({ operation }) => `${operation.method.toUpperCase()} ${operation.path}`,
  toIdentifierType: (): IdentifierType => ({ type: 'document' }),
  toExportPath: ({ operation }) => toDocsExportPath(operation),
  toEnrichmentSchema
})

/**
 * The base of a referenced type's definition: a section named for its `$ref`
 * (`### SimpleUser`), written into the document that links to it. Each
 * document is self-contained, so a type is written once per document that
 * uses it: the document's path is part of the type's identity.
 */
export const TypeDefinitionBase = toModelProjectionBase<EnrichmentSchema, IdentifierType, TypeDefinitionOptions>(
  MdSnippet,
  {
    id: denoJson.name,
    toIdentifierName: ({ refName }) => camelCase(refName, { upperFirst: true }),
    toIdentifierType: (): IdentifierType => ({ type: 'section' }),
    toExportPath: ({ options }) => options.documentPath,
    toEnrichmentSchema
  }
)
