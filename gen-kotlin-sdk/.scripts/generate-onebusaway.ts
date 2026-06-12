/**
 * Corpus harness runner (note 32, parity ladder): parses the pinned
 * OneBusAway spec, runs the full Parse → Generate → Render pipeline
 * with gen-kotlin-sdk, and writes the artifact tree to
 * `kotlin-sdk-corpus/onebusaway/ours/` for the compare.py gates.
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { parse } from 'jsr:@std/yaml@^1.0.5'
import { dirname } from 'jsr:@std/path@^1.1.2/dirname'
import { join } from 'jsr:@std/path@^1.1.2/join'
import type { OpenAPIV3 } from 'openapi-types'
import { toKotlinSdkEntry } from '../src/mod.ts'
import { toFieldStates } from '../src/SdkConfig.ts'
import sdkConfig from '../src/sdk-config.json' with { type: 'json' }

const corpusRoot = '/Users/dmitrigrabov/workspace/skmtc-root/kotlin-sdk-corpus/onebusaway'
const oursRoot = join(corpusRoot, 'ours')

const yamlText = Deno.readTextFileSync(join(corpusRoot, 'openapi.yml'))
const enrichments = JSON.parse(
  Deno.readTextFileSync(join(corpusRoot, 'enrichments.json'))
)
// Test-tier harness: the corpus spec is known-good OpenAPI v3.
const documentObject = parse(yamlText) as OpenAPIV3.Document

const entry = toKotlinSdkEntry({
  ...sdkConfig,
  fieldStates: toFieldStates(sdkConfig.fieldStates)
})

const { artifacts, manifest } = toArtifacts({
  traceId: 'gen-kotlin-sdk-corpus',
  spanId: 'onebusaway',
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
  console.error('parse errors:', parseErrors)
  Deno.exit(1)
}

try {
  Deno.removeSync(oursRoot, { recursive: true })
} catch {
  // first run
}

for (const [path, content] of Object.entries(artifacts)) {
  const target = join(oursRoot, path)
  Deno.mkdirSync(dirname(target), { recursive: true })
  Deno.writeTextFileSync(target, content)
}

console.log(`wrote ${Object.keys(artifacts).length} files to ${oursRoot}`)
