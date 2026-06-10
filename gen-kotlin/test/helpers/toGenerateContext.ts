import { GenerateContext, OasDocument } from '@skmtc/core'
import type { SkmtcParsedDocument } from '@skmtc/core'
import * as log from 'jsr:@std/log@0.224/logger'
import { toKotlinEntry } from '../../src/mod.ts'

// Constructing the entry sets the per-run basePackage module state — the
// test analog of the consumer's `toKotlinEntry({ basePackage })` call.
const kotlinEntry = toKotlinEntry({ basePackage: 'com.example.api' })

type ToGenerateContextArgs = {
  oasDocument?: SkmtcParsedDocument
}

export const toGenerateContext = ({ oasDocument }: ToGenerateContextArgs = {}) => {
  const context = new GenerateContext({
    document: oasDocument ?? { type: 'oas', value: new OasDocument() },
    settings: undefined,
    logger: new log.Logger('test', 'ERROR'),
    captureCurrentResult: () => {},
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-kotlin': kotlinEntry
    })
  })

  return context
}
