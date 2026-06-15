/**
 * Target-parameterized corpus runner. Reads the project's
 * `kotlin-sdk-corpus/<target>/.skmtc/.settings/client.json`
 * (source + basePath + packages + per-operation enrichments) and the
 * target's `sdk-config.json` (+ `template-overlay.json?`), and injects the
 * SDK-global config as the **`_stack` enrichment** — the id-agnostic channel
 * the migrated SDK and the embedded jackson-s engine both read off
 * `context.settings`. Writes the tree to `…/<target>/ours/`.
 *
 * No file swapping: config flows through `context.settings`, not a baked-in
 * `src/sdk-config.json`. (The `fileHeader` is the former `generatedFileHeader`
 * constant, now a config field.)
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { parse } from 'jsr:@std/yaml@^1.0.5'
import { dirname } from 'jsr:@std/path@^1.1.2/dirname'
import { join } from 'jsr:@std/path@^1.1.2/join'
import type { OpenAPIV3 } from 'openapi-types'

const target = Deno.args[0]

if (!target) {
  console.error('usage: generate.ts <target>')
  Deno.exit(2)
}

const corpusRoot = `/Users/dmitrigrabov/workspace/skmtc-root/kotlin-sdk-corpus/${target}`
const oursRoot = join(corpusRoot, 'ours')

// Test-tier harness: corpus inputs are known-good.
const client = JSON.parse(
  Deno.readTextFileSync(join(corpusRoot, '.skmtc', '.settings', 'client.json'))
)
const { basePath, enrichments, packages } = client.settings

const documentObject = parse(
  Deno.readTextFileSync(join(corpusRoot, client.source))
) as OpenAPIV3.Document

const stackConfig = JSON.parse(Deno.readTextFileSync(join(corpusRoot, 'sdk-config.json')))
stackConfig.fileHeader = '// File generated from our OpenAPI spec by Stainless.'

try {
  stackConfig.staticOverlay = JSON.parse(
    Deno.readTextFileSync(join(corpusRoot, 'template-overlay.json'))
  )
} catch {
  // no overlay for this target
}

const { default: entry } = await import('../src/mod.ts')

const { artifacts, manifest } = toArtifacts({
  traceId: 'gen-kotlin-sdk-corpus',
  spanId: target,
  startAt: Date.now(),
  document: { type: 'oas', value: documentObject },
  settings: { basePath, enrichments: { ...enrichments, _stack: stackConfig }, packages },
  stackTrail: new StackTrail([]),
  silent: true,
  toGeneratorConfigMap: () => ({
    // @ts-expect-error - factory entry vs the generic config map (the known variance gap)
    '@skmtc/gen-kotlin-sdk': entry
  })
})

const parseErrors = manifest.parseIssues.filter(issue => issue.level === 'error')

if (parseErrors.length) {
  console.error('parse errors:', parseErrors.slice(0, 5))
}

try {
  Deno.removeSync(oursRoot, { recursive: true })
} catch {
  // first run
}

for (const [path, content] of Object.entries(artifacts)) {
  const filePath = join(oursRoot, path)
  Deno.mkdirSync(dirname(filePath), { recursive: true })
  Deno.writeTextFileSync(filePath, content)
}

console.log(`wrote ${Object.keys(artifacts).length} files to ${oursRoot}`)
