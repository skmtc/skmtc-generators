import { assert, assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Responses } from '../../src/snippets/Responses.ts'
import { Definitions } from '../../src/snippets/Schema.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

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
  const definitions = new Definitions({ context })
  const responses = new Responses({
    context,
    responses: parsed.value.operations[0].responses,
    definitions
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

Deno.test('Responses - renders the empty string when there are no responses', () => {
  const context = toGenerateContext()
  const responses = new Responses({ context, responses: {}, definitions: new Definitions({ context }) })

  assertEquals(responses.toString(), '')
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
    definitions: new Definitions({ context })
  })

  assertEquals(
    responses.toString(),
    [
      '## Responses',
      '### `200` — The file\n\nContent type: `application/octet-stream`\n\n`string` binary'
    ].join('\n\n')
  )
})
