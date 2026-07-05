import { GenerateContext, OasDocument } from '@skmtc/core'
import type { SkmtcParsedDocument } from '@skmtc/core'
import * as log from 'jsr:@std/log@0.224/logger'

type ToGenerateContextArgs = {
  oasDocument?: SkmtcParsedDocument
}

/**
 * Build a real `GenerateContext` over an empty OpenAPI document, for unit
 * testing presentational snippets in isolation. Mirrors the per-package test
 * helper used across the generator workspace — a real context, no mock types
 * and no casts.
 */
export const toGenerateContext = ({ oasDocument }: ToGenerateContextArgs = {}) =>
  new GenerateContext({
    document: oasDocument ?? { type: 'oas', value: new OasDocument() },
    settings: undefined,
    logger: new log.Logger('test', 'ERROR'),
    captureCurrentResult: () => {},
    toGeneratorConfigMap: () => ({})
  })
