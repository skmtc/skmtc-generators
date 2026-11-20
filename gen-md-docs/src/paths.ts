import { camelCase, type GenerateContextType, type OasDocument, type OasOperation } from '@skmtc/core'

type ToDocumentPathArgs = {
  context: GenerateContextType
  operation: OasOperation
}

/**
 * The path of an operation's document: its {@link toDocsExportPath}, unless
 * an operation before it in the document takes that path already. Different
 * operations can share one, as `/pets` and `/pets/` do, or `/pets/{id}` and
 * `/pets/id`. Each one after the first gets `-2`, `-3` and so on, in the
 * document's order, as in `@/docs/pets-GET-2.md`. No path ends in a digit
 * otherwise, as the method comes last, so the suffix makes every path unique.
 *
 * It depends only on the document, so an operation's path is the same on
 * every run. The paths are worked out once per document.
 */
export const toDocumentPath = ({ context, operation }: ToDocumentPathArgs): string => {
  if (context.document.type !== 'oas') {
    throw new Error('gen-md-docs documents the operations of an OpenAPI document only')
  }

  const document = context.document.value
  const paths = documentPaths.get(document) ?? toDocumentPaths(document)
  const path = paths.get(operation)

  documentPaths.set(document, paths)

  if (path === undefined) {
    throw new Error(`${operation.method.toUpperCase()} ${operation.path} is not one of the document's operations`)
  }

  return path
}

/** Each parsed document's document paths, by operation. */
const documentPaths = new WeakMap<OasDocument, Map<OasOperation, string>>()

/** The document paths of every operation in `document`, made unique in the document's order. */
const toDocumentPaths = (document: OasDocument): Map<OasOperation, string> => {
  const uses = new Map<string, number>()

  return new Map(
    document.operations.map(operation => {
      const path = toDocsExportPath(operation)
      const use = (uses.get(path) ?? 0) + 1

      uses.set(path, use)

      return [operation, use === 1 ? path : path.replace(/\.md$/, `-${use}.md`)]
    })
  )
}

/**
 * The export path for an operation's documentation — grouped into a folder by
 * its first tag, named as the path (each segment camelCased, joined by hyphens)
 * with the upper-cased method last, e.g.
 * `@/docs/actions/repos-owner-repo-actions-runs-runId-rerun-POST.md`.
 * The root path `/` has no segments, so it is named `root`. Untagged operations
 * land directly under `@/docs`.
 */
export const toDocsExportPath = (operation: OasOperation): string => {
  const name = `${toPathName(operation.path) || 'root'}-${operation.method.toUpperCase()}.md`
  const tag = operation.tags?.[0]

  return tag ? `@/docs/${toKebabCase(tag)}/${name}` : `@/docs/${name}`
}

/**
 * The path as hyphen-joined segments, each camelCased so a multi-word path
 * parameter reads as one word — `{run_id}` → `runId`, not `run-id`.
 */
const toPathName = (path: string): string =>
  path
    .split('/')
    .map(segment => segment.replace(/[{}]/g, ''))
    .filter(segment => segment !== '')
    .map(segment => camelCase(segment))
    .join('-')

/** Kebab-case for a tag folder: case boundaries and non-alphanumerics, lower-cased. */
const toKebabCase = (input: string): string =>
  input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
