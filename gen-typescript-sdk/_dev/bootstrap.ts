// Bootstrap a complete enrichment block by mining openai-node's resource
// files and correlating them with the OpenAPI spec:
//
//   - grouping: every `this._client.<verb>(<path>, …)` pairs (path, method)
//     with the resource (from the file's location, incl. nested dirs) and the
//     enclosing method name.
//   - renames: the operation's spec response/body `$ref` is paired with the
//     type name openai-node uses in that method's signature
//     (`APIPromise<X>` / `body: Y`), giving the `schemaNames` map.
//
//   deno run --allow-read --allow-write _dev/bootstrap.ts
//
// Writes _dev/enrichments.bootstrap.json (ready to drop under the generator id).

import { join, dirname, fromFileUrl } from '@std/path'
import { parse as parseYaml } from 'jsr:@std/yaml@^1'

const ROOT = '/Users/dmitrigrabov/workspace/skmtc-root'
const RESOURCES_DIR = `${ROOT}/openai-node/src/resources`
const SPEC_PATH = `${ROOT}/openai-openapi.yml`
const GENERATOR_ID = '@skmtc/gen-typescript-sdk'
const FILE_HEADER = '// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.'

const here = dirname(fromFileUrl(import.meta.url))

/** The dotted resource path for a resource file, from its path under resources/. */
const toResource = (relativePath: string): string => {
  const segments = relativePath.replace(/\.ts$/, '').split('/')
  const directories = segments.slice(0, -1)
  const basename = segments[segments.length - 1]

  if (directories.length > 0 && directories[directories.length - 1] === basename) {
    return directories.join('.')
  }
  return [...directories, basename].join('.')
}

/** Convert an emitted client path expression back to the OpenAPI path. */
const toSpecPath = (expression: string): string => {
  if (expression.startsWith("'")) {
    return expression.slice(1, -1)
  }
  return expression.slice(5, -1).replace(/\$\{([^}]+)\}/g, (_match, name) => `{${name}}`)
}

async function* walkTs(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const full = join(dir, entry.name)
    if (entry.isDirectory) {
      yield* walkTs(full)
    } else if (entry.isFile && entry.name.endsWith('.ts') && entry.name !== 'index.ts') {
      yield full
    }
  }
}

const CALL = /this\._client\.(get|post|put|patch|delete|getAPIList)\(\s*(path`[^`]*`|'[^']*')/
const METHOD = /^ {2}([A-Za-z_]\w*)\(/

type Entry = {
  resource: string
  methodName: string
  path: string
  method: string
  responseType: string | undefined
  bodyType: string | undefined
}

const entries: Entry[] = []
const resources = new Set<string>()

for await (const file of walkTs(RESOURCES_DIR)) {
  const relativePath = file.slice(RESOURCES_DIR.length + 1)
  const content = await Deno.readTextFile(file)
  if (!/extends APIResource/.test(content)) continue

  const resource = toResource(relativePath)
  resources.add(resource)

  const lines = content.split('\n')
  lines.forEach((line, index) => {
    const call = line.match(CALL)
    if (!call) return

    const method = call[1] === 'getAPIList' ? 'get' : call[1]
    const path = toSpecPath(call[2])

    let declarationLine = -1
    let methodName: string | undefined
    for (let back = index; back >= 0; back--) {
      const declaration = lines[back].match(METHOD)
      if (declaration) {
        methodName = declaration[1]
        declarationLine = back
        break
      }
    }
    if (!methodName) return

    // The signature spans the declaration line up to the body's `{`.
    const signature = lines.slice(declarationLine, index).join(' ')
    const returnType = signature.match(/\):\s*([^{]+?)\s*\{/)?.[1]?.trim()
    const bodyType = signature.match(/\bbody:\s*([A-Za-z_]\w*)/)?.[1]

    entries.push({ resource, methodName, path, method, responseType: returnType, bodyType })
  })
}

// ─── Spec: (path, method) → response/body $ref names ───────────────────────
// deno-lint-ignore no-explicit-any
const spec = parseYaml(await Deno.readTextFile(SPEC_PATH)) as any
const specPaths = spec?.paths ?? {}

// deno-lint-ignore no-explicit-any
const refName = (schema: any): string | undefined =>
  typeof schema?.$ref === 'string' ? schema.$ref.split('/').pop() : undefined

const opRefs = (path: string, method: string): { responseRef?: string; bodyRef?: string } => {
  const op = specPaths?.[path]?.[method]
  if (!op) return {}

  const response =
    op.responses?.['200'] ?? op.responses?.['201'] ?? op.responses?.['2XX'] ?? op.responses?.default
  const responseRef = refName(response?.content?.['application/json']?.schema)
  const bodyRef = refName(op.requestBody?.content?.['application/json']?.schema)

  return { responseRef, bodyRef }
}

// ─── Correlate → schemaNames ───────────────────────────────────────────────
const schemaNames: Record<string, string> = {}
let unmatchedOps = 0
for (const entry of entries) {
  const { responseRef, bodyRef } = opRefs(entry.path, entry.method)
  if (!responseRef && !bodyRef) unmatchedOps++

  // Only the simple `APIPromise<Identifier>` shape — skip paginated /
  // streaming / union return types (the consumed list response, etc.).
  const apiPromise = entry.responseType?.match(/^APIPromise<(\w+)>$/)
  if (responseRef && apiPromise) {
    schemaNames[responseRef] = apiPromise[1]
  }
  if (bodyRef && entry.bodyType) {
    schemaNames[bodyRef] = entry.bodyType
  }
}

// ─── Shape into the generator's enrichment block ───────────────────────────
// deno-lint-ignore no-explicit-any
const subjects: Record<string, any> = {}
for (const { resource, methodName, path, method } of entries) {
  subjects[path] ??= {}
  subjects[path][method] = { main: { resource, methodName } }
}

const enrichments = {
  [GENERATOR_ID]: {
    _generator: { clientName: 'OpenAI', fileHeader: FILE_HEADER, schemaNames },
    ...subjects
  }
}

await Deno.writeTextFile(join(here, 'enrichments.bootstrap.json'), JSON.stringify(enrichments, null, 2))

console.log(`resources:  ${resources.size}`)
console.log(`operations: ${entries.length}  (paths: ${Object.keys(subjects).length}, unmatched in spec: ${unmatchedOps})`)
console.log(`renames:    ${Object.keys(schemaNames).length}`)
console.log('\nsample renames:')
for (const [from, to] of Object.entries(schemaNames).filter(([f, t]) => f !== t).slice(0, 14)) {
  console.log(`  ${from.padEnd(40)} → ${to}`)
}
