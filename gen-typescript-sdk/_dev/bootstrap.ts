// Bootstrap the resource-grouping enrichments by mining openai-node's own
// resource files. For every `this._client.<verb>(<path>, …)` call it pairs
// the (path, method) with the resource (derived from the file's location)
// and the method name (the enclosing class method) — the exact
// `resource` / `methodName` enrichments gen-typescript-sdk consumes.
//
//   deno run --allow-read --allow-write _dev/bootstrap.ts
//
// Writes _dev/enrichments.bootstrap.json.

import { join, dirname, fromFileUrl } from '@std/path'

const RESOURCES_DIR = '/Users/dmitrigrabov/workspace/skmtc-root/openai-node/src/resources'
const here = dirname(fromFileUrl(import.meta.url))

/** The dotted resource path for a resource file, from its path under resources/. */
const toResource = (relativePath: string): string => {
  const segments = relativePath.replace(/\.ts$/, '').split('/')
  const directories = segments.slice(0, -1)
  const basename = segments[segments.length - 1]

  // A "self" file (chat/chat.ts, completions/completions.ts) names its own
  // directory — the resource is the directory path, not doubled.
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
  // path`/x/${id}` → /x/{id}
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

type Entry = { resource: string; methodName: string; path: string; method: string }
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

    let methodName: string | undefined
    for (let back = index; back >= 0; back--) {
      const declaration = lines[back].match(METHOD)
      if (declaration) {
        methodName = declaration[1]
        break
      }
    }
    if (methodName) {
      entries.push({ resource, methodName, path, method })
    }
  })
}

// Shape into the enrichment tree: [path][method].main = { resource, methodName }.
const enrichments: Record<string, Record<string, { main: { resource: string; methodName: string } }>> = {}
let collisions = 0
for (const { resource, methodName, path, method } of entries) {
  enrichments[path] ??= {}
  if (enrichments[path][method]) collisions++
  enrichments[path][method] = { main: { resource, methodName } }
}

await Deno.writeTextFile(join(here, 'enrichments.bootstrap.json'), JSON.stringify(enrichments, null, 2))

console.log(`resources: ${resources.size}`)
console.log(`operations: ${entries.length}  (path×method keys: ${Object.keys(enrichments).length}, collisions: ${collisions})`)
console.log('\nsample (first 12):')
for (const entry of entries.slice(0, 12)) {
  console.log(`  ${entry.method.toUpperCase().padEnd(6)} ${entry.path.padEnd(36)} → ${entry.resource}.${entry.methodName}`)
}
console.log('\nnested-resource sample:')
for (const entry of entries.filter(e => e.resource.includes('.')).slice(0, 8)) {
  console.log(`  ${entry.method.toUpperCase().padEnd(6)} ${entry.path.padEnd(40)} → ${entry.resource}.${entry.methodName}`)
}
