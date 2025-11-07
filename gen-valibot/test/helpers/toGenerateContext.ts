import { GenerateContext, OasDocument } from '@skmtc/core'
import * as log from 'jsr:@std/log@0.224/logger'
import { valibotEntry } from '../../src/mod.ts'

type ToGenerateContextArgs = {
  oasDocument?: OasDocument
}

export const toGenerateContext = ({ oasDocument }: ToGenerateContextArgs = {}) => {
  const context = new GenerateContext({
    oasDocument: oasDocument ?? new OasDocument(),
    settings: undefined,
    logger: new log.Logger('test', 'ERROR'),
    captureCurrentResult: () => {},
    // @ts-expect-error - mock implementation
    toGeneratorConfigMap: () => ({
      '@skmtc/gen-valibot': valibotEntry
    })
  })

  return context
}
