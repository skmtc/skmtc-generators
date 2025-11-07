import { ParseContext } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import * as log from 'jsr:@std/log@^0.224.0'

type ToParseContextArgs = {
  schemas?: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
}

export const toParseContext = ({ schemas }: ToParseContextArgs = {}) => {
  const documentObject: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {},
    components: {
      schemas
    }
  }

  return new ParseContext({
    documentObject,
    logger: new log.Logger('test', 'ERROR'),
    silent: true
  })
}
