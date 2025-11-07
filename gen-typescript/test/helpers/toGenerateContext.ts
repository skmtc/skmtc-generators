import { GenerateContext, type GenerateContextType, OasDocument, StackTrail } from '@skmtc/core'
import * as log from 'jsr:@std/log@0.224/logger'
import { typescriptEntry } from '../../src/mod.ts'

type ToGenerateContextArgs = {
  oasDocument?: OasDocument
}

export const toGenerateContext = ({ oasDocument }: ToGenerateContextArgs = {}) => {
  const context = new GenerateContext({
    oasDocument: oasDocument ?? new OasDocument(),
    settings: undefined,
    logger: new log.Logger('test', 'ERROR'),
    stackTrail: new StackTrail(),
    captureCurrentResult: () => {},
    // @ts-expect-error - mock implementation
    toGeneratorConfigMap: () => ({
      '@skmtc/gen-typescript': typescriptEntry
    })
  })

  return context
}
