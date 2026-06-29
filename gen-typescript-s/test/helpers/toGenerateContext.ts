import { GenerateContext, OasDocument } from '@skmtc/core'
import type { SkmtcParsedDocument } from '@skmtc/core'
import * as log from 'jsr:@std/log@0.224/logger'
import { typescriptEntry } from '../../src/mod.ts'

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
      '@skmtc/gen-typescript': typescriptEntry
    })
  })

  return context
}
