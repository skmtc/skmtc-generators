/**
 * Target-parameterized corpus runner (note 32 §KS-F F1):
 * `deno run … generate.ts <target>` reads
 * `kotlin-sdk-corpus/<target>/{openapi.yml, enrichments.json,
 * sdk-config.json}` and writes the tree to `…/<target>/ours/`.
 * OneBusAway keeps its dedicated script (its config doubles as the
 * package's default-export seam).
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { parse } from 'jsr:@std/yaml@^1.0.5'
import { dirname } from 'jsr:@std/path@^1.1.2/dirname'
import { join } from 'jsr:@std/path@^1.1.2/join'
import type { OpenAPIV3 } from 'openapi-types'
import { toKotlinSdkEntry } from '../src/mod.ts'
import type { StaticFilesOverlay } from '../src/emitStaticFiles.ts'
import { toFieldStates, toModelsLayout, type SdkConfig } from '../src/SdkConfig.ts'

const target = Deno.args[0]

if (!target) {
  console.error('usage: generate.ts <target>')
  Deno.exit(2)
}

const corpusRoot = `/Users/dmitrigrabov/workspace/skmtc-root/kotlin-sdk-corpus/${target}`
const oursRoot = join(corpusRoot, 'ours')

// Test-tier harness: corpus inputs are known-good.
const documentObject = parse(
  Deno.readTextFileSync(join(corpusRoot, 'openapi.yml'))
) as OpenAPIV3.Document
const enrichments = JSON.parse(Deno.readTextFileSync(join(corpusRoot, 'enrichments.json')))
const rawConfig = JSON.parse(Deno.readTextFileSync(join(corpusRoot, 'sdk-config.json')))

const config: SdkConfig = {
  ...rawConfig,
  fieldStates: toFieldStates(rawConfig.fieldStates),
  modelsLayout: toModelsLayout(rawConfig.modelsLayout)
}

let staticOverlay: StaticFilesOverlay | undefined

try {
  // Test-tier harness: overlay data is compiler output, known-good.
  staticOverlay = JSON.parse(
    Deno.readTextFileSync(join(corpusRoot, 'template-overlay.json'))
  ) as StaticFilesOverlay
} catch {
  // no overlay for this target
}

const entry = toKotlinSdkEntry(config, { staticOverlay })

const { artifacts, manifest } = toArtifacts({
  traceId: 'gen-kotlin-sdk-corpus',
  spanId: target,
  startAt: Date.now(),
  document: { type: 'oas', value: documentObject },
  settings: {
    basePath: '.',
    enrichments,
    packages: [
      { rootPath: `${config.artifactName}-core/src/main/kotlin` },
      { rootPath: `${config.artifactName}-client-okhttp/src/main/kotlin` }
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
