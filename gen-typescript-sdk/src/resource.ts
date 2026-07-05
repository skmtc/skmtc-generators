import { capitalize, camelCase } from '@skmtc/core'
import type { OasSchema, OasRef } from '@skmtc/core'
import { join } from '@std/path'

/**
 * The resource class name — the last segment of a dotted resource path,
 * PascalCased. `'models'` → `Models`; `'chat.completions'` → `Completions`;
 * `'fine_tuning.jobs'` → `Jobs`.
 */
export const toResourceClassName = (resource: string): string => {
  const segments = resource.split('.')
  const last = segments[segments.length - 1]

  return capitalize(camelCase(last))
}

/**
 * The export path for a resource file. A leaf resource lives as a file in
 * its parent's directory: `'models'` → `@/resources/models.ts`,
 * `'chat.completions.messages'` → `@/resources/chat/completions/messages.ts`.
 *
 * (A resource that *has* children lives in its own directory —
 * `chat` → `@/resources/chat/chat.ts` — which needs the global resource
 * tree; that variant is handled where the tree is known, not here.)
 */
export const toResourceExportPath = (resource: string): string => {
  const segments = resource.split('.')
  const fileName = `${segments[segments.length - 1]}.ts`

  return join('@', 'resources', ...segments.slice(0, -1), fileName)
}

/**
 * A path parameter's TypeScript name. Stainless camelCases the OpenAPI
 * parameter name and upper-cases the `Id` acronym: `batch_id` → `batchID`,
 * `thread_id` → `threadID`, `model` → `model`. Used for BOTH the positional
 * argument and the `path` interpolation so they line up.
 */
export const toParamName = (name: string): string => camelCase(name).replace(/Id$/, 'ID')

/**
 * The client-call path expression. A parametrised path becomes a `path`
 * tagged template (`path` + a backtick template with `${param}`
 * interpolations); a static path becomes a plain quoted string. Params are
 * named via {@link toParamName}.
 *
 * `/batches/{batch_id}` → `` path`/batches/${batchID}` ``
 * `/models`            → `'/models'`
 */
export const toClientPath = (path: string): { expression: string; hasParams: boolean } => {
  const hasParams = /\{[^}]+\}/.test(path)

  if (!hasParams) {
    return { expression: `'${path}'`, hasParams: false }
  }

  const template = path.replace(/\{([^}]+)\}/g, (_match, name) => '${' + toParamName(name) + '}')

  return { expression: 'path`' + template + '`', hasParams: true }
}

/**
 * A list-shaped success response (`{ object: 'list', data: T[] }`) →
 * pagination: the item schema (`data`'s element). The list wrapper itself is
 * never emitted; the method becomes a `getAPIList` / `PagePromise`.
 */
export const toPagination = (
  schema: OasSchema | OasRef<'schema'>
): { itemSchema: OasSchema | OasRef<'schema'> } | undefined => {
  const object = schema.isRef() ? schema.resolve() : schema
  if (object.type !== 'object') return undefined

  const data = object.properties?.['data']
  const objectProp = object.properties?.['object']

  if (data?.type !== 'array') return undefined
  if (!(objectProp?.type === 'string' && Array.isArray(objectProp.enums) && objectProp.enums.includes('list'))) {
    return undefined
  }

  return { itemSchema: data.items }
}
