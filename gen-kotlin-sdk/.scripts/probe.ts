import { StackTrail, toArtifacts } from '@skmtc/core'
import { parse } from 'jsr:@std/yaml@^1.0.5'
import { join } from 'jsr:@std/path@^1.1.2/join'
import type { OpenAPIV3 } from 'openapi-types'
import { toKotlinSdkEntry } from '../src/mod.ts'
import { toFieldStates } from '../src/SdkConfig.ts'
import sdkConfig from '../src/sdk-config.json' with { type: 'json' }

const corpusRoot = '/Users/dmitrigrabov/workspace/skmtc-root/kotlin-sdk-corpus/onebusaway'
const documentObject = parse(
  Deno.readTextFileSync(join(corpusRoot, 'openapi.yml'))
) as OpenAPIV3.Document
const enrichments = JSON.parse(Deno.readTextFileSync(join(corpusRoot, 'enrichments.json')))

const entry = toKotlinSdkEntry({
  ...sdkConfig,
  fieldStates: toFieldStates(sdkConfig.fieldStates)
})

const { artifacts, manifest } = toArtifacts({
  traceId: 'probe',
  spanId: 'probe',
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

console.log('artifact count:', Object.keys(artifacts).length)
console.log('model artifacts:', Object.keys(artifacts).filter(path => path.includes('models')))
const resultsText = JSON.stringify(manifest.results, null, 1)
const errorLines = resultsText.split('\n').filter(line => line.includes('"error"'))
console.log('error leaves:', errorLines.slice(0, 10))
console.log('issues:', JSON.stringify(manifest.parseIssues?.slice(0, 4) ?? []))
