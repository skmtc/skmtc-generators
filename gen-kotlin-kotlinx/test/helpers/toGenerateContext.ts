import { GenerateContext, OasDocument } from '@skmtc/core'
import type { SkmtcParsedDocument } from '@skmtc/core'
import * as log from 'jsr:@std/log@0.224/logger'
import kotlinEntry from '../../src/mod.ts'

type ToGenerateContextArgs = {
  oasDocument?: SkmtcParsedDocument
}

export const toGenerateContext = ({ oasDocument }: ToGenerateContextArgs = {}) => {
  const context = new GenerateContext({
    document: oasDocument ?? { type: 'oas', value: new OasDocument() },
    // The generator config now rides the `_generator` enrichment scope (the
    // consumer's `client.json`); the value layer reads it off `context`.
    settings: {
      basePath: './app/src/main/kotlin',
      enrichments: {
        '@skmtc/gen-kotlin-kotlinx': { _generator: { basePackage: 'com.example.api' } }
      }
    },
    logger: new log.Logger('test', 'ERROR'),
    captureCurrentResult: () => {},
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory entry vs the generic config map (the known variance gap)
      '@skmtc/gen-kotlin-kotlinx': kotlinEntry
    })
  })

  return context
}
