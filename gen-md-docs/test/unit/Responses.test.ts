import { assert, assertEquals } from '@std/assert'
import { Responses } from '../../src/snippets/Responses.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

/** The document the snippets are written in, suffixed as the engine names a projection's file. */
const DOC = '@/docs/test.generated.md'

Deno.test('Responses - renders every status code with description and schema', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': {
              description: 'A list of pets',
              content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } }
            },
            '404': { description: 'Not found' }
          }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const context = toGenerateContext({ oasDocument: parsed })
  const responses = new Responses({
    context,
    responses: parsed.value.operations[0].responses,
    destinationPath: DOC
  })

  // Both codes documented; the no-content 404 renders heading-only.
  assertEquals(
    responses.toString(),
    [
      '## Responses',
      '### `200` — A list of pets',
      '`string[]`',
      '### `404` — Not found'
    ].join('\n\n')
  )
})

Deno.test('Responses - surfaces a non-JSON content type and its schema', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/download': {
        get: {
          responses: {
            '200': {
              description: 'The file',
              content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } }
            }
          }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const context = toGenerateContext({ oasDocument: parsed })
  const responses = new Responses({
    context,
    responses: parsed.value.operations[0].responses,
    destinationPath: DOC
  })

  assertEquals(
    responses.toString(),
    [
      '## Responses',
      '### `200` — The file\n\nContent type: `application/octet-stream`\n\n`string` binary'
    ].join('\n\n')
  )
})

Deno.test('Responses - renders the JSON schema when a non-JSON media type comes first', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': {
              description: 'A pet',
              content: {
                'text/plain': { schema: { type: 'string' } },
                'application/vnd.api+json': {
                  schema: { type: 'object', properties: { id: { type: 'integer' } } }
                }
              }
            }
          }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const context = toGenerateContext({ oasDocument: parsed })
  const responses = new Responses({
    context,
    responses: parsed.value.operations[0].responses,
    destinationPath: DOC
  })

  assertEquals(
    responses.toString(),
    [
      '## Responses',
      '### `200` — A pet\n\nContent types: `text/plain`, `application/vnd.api+json`\n\n`object`\n- **id** `integer`'
    ].join('\n\n')
  )
})

Deno.test('Responses - a text/plain-only response still renders its schema', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/greeting': {
        get: {
          responses: {
            '200': { description: 'A greeting', content: { 'text/plain': { schema: { type: 'string' } } } }
          }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const context = toGenerateContext({ oasDocument: parsed })
  const responses = new Responses({
    context,
    responses: parsed.value.operations[0].responses,
    destinationPath: DOC
  })

  assertEquals(
    responses.toString(),
    ['## Responses', '### `200` — A greeting\n\nContent type: `text/plain`\n\n`string`'].join('\n\n')
  )
})
