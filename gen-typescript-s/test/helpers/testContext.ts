import { GenerateContext, type GenerateContextType, ParseContext, StackTrail } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import * as log from 'jsr:@std/log@^0.224.0'
import { typescriptEntry } from '../../src/mod.ts'

/**
 * Creates a mock GenerateContext for testing
 */
export function createMockContext(): GenerateContextType {
  // Create a minimal OpenAPI document
  const documentObject: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {},
    components: {
      schemas: {}
    }
  }

  // Create a mock logger
  const logger = new log.Logger('test', 'ERROR', {
    handlers: []
  })

  // Create a mock stack trail
  const stackTrail = new StackTrail()

  // Create ParseContext
  const parseContext = new ParseContext({
    input: { type: 'oas', value: documentObject },
    logger,
    silent: true
  })

  // Parse to get the SkmtcParsedDocument
  const document = parseContext.parse(stackTrail)

  // Create GenerateContext
  const generateContext = new GenerateContext({
    document,
    settings: undefined,
    logger,
    captureCurrentResult: () => {},
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-typescript': typescriptEntry
    })
  })

  return generateContext
}
