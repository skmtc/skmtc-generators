/**
 * Target-parameterized corpus runner (note 32 §KS-F F1):
 * `deno run … generate.ts <target>` reads
 * `kotlin-sdk-corpus/<target>/{openapi.yml, enrichments.json,
 * sdk-config.json, template-overlay.json?}` and writes the tree to
 * `…/<target>/ours/`.
 *
 * The generator imports its config directly from
 * `src/sdk-config.json` (no factory closure), so this harness swaps
 * that file to the target's config — with the template overlay merged
 * in — before dynamically importing the entry, and restores the
 * product config afterwards.
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { parse } from 'jsr:@std/yaml@^1.0.5'
import { dirname } from 'jsr:@std/path@^1.1.2/dirname'
import { join } from 'jsr:@std/path@^1.1.2/join'
import { fromFileUrl } from 'jsr:@std/path@^1.1.2/from-file-url'
import type { OpenAPIV3 } from 'openapi-types'

const target = Deno.args[0]

if (!target) {
  console.error('usage: generate.ts <target>')
  Deno.exit(2)
}

const corpusRoot = `/Users/dmitrigrabov/workspace/skmtc-root/kotlin-sdk-corpus/${target}`
const oursRoot = join(corpusRoot, 'ours')
const configPath = fromFileUrl(new URL('../src/sdk-config.json', import.meta.url))

// Test-tier harness: corpus inputs are known-good.
const documentObject = parse(
  Deno.readTextFileSync(join(corpusRoot, 'openapi.yml'))
) as OpenAPIV3.Document
const enrichments = JSON.parse(Deno.readTextFileSync(join(corpusRoot, 'enrichments.json')))
const targetConfig = JSON.parse(Deno.readTextFileSync(join(corpusRoot, 'sdk-config.json')))

try {
  targetConfig.staticOverlay = JSON.parse(
    Deno.readTextFileSync(join(corpusRoot, 'template-overlay.json'))
  )
} catch {
  // no overlay for this target
}

const productConfig = Deno.readTextFileSync(configPath)
Deno.writeTextFileSync(configPath, JSON.stringify(targetConfig, null, 2) + '\n')

try {
  const { default: entry } = await import('../src/mod.ts')
  const { sdkConfig } = await import('../src/config.ts')

  const { artifacts, manifest } = toArtifacts({
    traceId: 'gen-kotlin-sdk-corpus',
    spanId: target,
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: {
      basePath: '.',
      enrichments,
      packages: [
        { rootPath: `${sdkConfig.artifactName}-core/src/main/kotlin` },
        { rootPath: `${sdkConfig.artifactName}-client-okhttp/src/main/kotlin` }
      ]
    },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
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
} finally {
  Deno.writeTextFileSync(configPath, productConfig)
}
