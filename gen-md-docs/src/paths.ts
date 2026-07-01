import { camelCase, type OasOperation } from '@skmtc/core'

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
