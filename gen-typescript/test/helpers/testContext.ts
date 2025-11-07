import { GenerateContext, type GenerateContextType, ParseContext, StackTrail } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import * as log from 'jsr:@std/log@^0.224.0'

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
    documentObject,
    logger,
    silent: true
  })

  // Parse to get OasDocument
  const oasDocument = parseContext.parse(stackTrail)

  // Create GenerateContext
  const generateContext = new GenerateContext({
    oasDocument,
    settings: undefined,
    logger,
    captureCurrentResult: () => {},
    // @ts-expect-error - mock implementation
    toGeneratorConfigMap: () => ({
      '@skmtc/gen-typescript': {
        entry: null as any,
        operationInsertables: {},
        modelInsertables: {},
        enrichments: undefined
      }
    })
  })

  return generateContext
}
