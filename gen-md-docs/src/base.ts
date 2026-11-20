import { toModelProjectionBase, toOasOperationProjectionBase, type IdentifierType } from '@skmtc/core'
import { MdSnippet } from './lang/MdSnippet.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** The options an operation's document is inserted with. */
export type OperationDocOptions = {
  /** The document's path, unique among the run's documents (see `toDocumentPath`). */
  documentPath: string
}

/** The options a referenced type is inserted with. */
export type TypeDefinitionOptions = {
  /** The document that links to the type, where its definition is written. */
  documentPath: string
}

/**
 * The base of an operation's document: one Markdown file per operation, at the
 * path the transform gives it. Method and path name it, so no component
 * schema's name can collide with it.
 */
export const OperationDocBase = toOasOperationProjectionBase<EnrichmentSchema, IdentifierType, OperationDocOptions>(
  MdSnippet,
  {
    id: denoJson.name,
    toIdentifierName: ({ operation }) => `${operation.method.toUpperCase()} ${operation.path}`,
    toIdentifierType: (): IdentifierType => ({ type: 'document' }),
    toExportPath: ({ options }) => options.documentPath,
    toEnrichmentSchema
  }
)

/**
 * The base of a referenced type's definition: a section for its `$ref`,
 * written into the document that links to it. Each document is
 * self-contained, so a type is written once per document that uses it: the
 * document's path is part of the type's identity.
 *
 * The section is named by the refName itself, which is unique in the
 * document's components. The name it is shown by (`SimpleUser`) can be the
 * same for two refNames (`pet` and `Pet`), so it is derived apart, with the
 * anchor, by `ComponentName`.
 */
export const TypeDefinitionBase = toModelProjectionBase<EnrichmentSchema, IdentifierType, TypeDefinitionOptions>(
  MdSnippet,
  {
    id: denoJson.name,
    toIdentifierName: ({ refName }) => refName,
    toIdentifierType: (): IdentifierType => ({ type: 'section' }),
    toExportPath: ({ options }) => options.documentPath,
    toEnrichmentSchema
  }
)

/**
 * The base of an expandable object's page (see `isExpandable`):
 * `@/docs/_types/<refName>.md`. The underscore keeps the folder apart from the
 * tag folders, whose names are kebab-case. The page is a document, named by
 * the refName.
 */
export const ObjectPageBase = toModelProjectionBase<EnrichmentSchema, IdentifierType>(MdSnippet, {
  id: denoJson.name,
  toIdentifierName: ({ refName }) => refName,
  toIdentifierType: (): IdentifierType => ({ type: 'document' }),
  toExportPath: ({ refName }) => `@/docs/_types/${refName}.md`,
  toEnrichmentSchema
})
