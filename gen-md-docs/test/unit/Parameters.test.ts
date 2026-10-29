import { assert, assertEquals } from '@std/assert'
import { OasInteger, OasObject, OasParameter, OasString } from '@skmtc/core'
import { Parameters } from '../../src/snippets/Parameters.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

Deno.test('Parameters - renders a heading and a parameter with its description', () => {
  const snippet = new Parameters({
    context: toGenerateContext(),
    title: 'Path parameters',
    parameters: [
      new OasParameter({
        name: 'id',
        location: 'path',
        required: true,
        description: 'The pet identifier',
        schema: new OasString({})
      })
    ]
  })

  assertEquals(
    snippet.toString(),
    '## Path parameters\n\n**id** `string` required — The pet identifier'
  )
})

Deno.test('Parameters - separates multiple parameters with a blank line', () => {
  const snippet = new Parameters({
    context: toGenerateContext(),
    title: 'Query parameters',
    parameters: [
      new OasParameter({ name: 'page', location: 'query', schema: new OasInteger({}) }),
      new OasParameter({ name: 'limit', location: 'query', schema: new OasInteger({}) })
    ]
  })

  assertEquals(
    snippet.toString(),
    '## Query parameters\n\n**page** `integer`\n\n**limit** `integer`'
  )
})

Deno.test('Parameters - expands the fields of an object parameter', () => {
  const snippet = new Parameters({
    context: toGenerateContext(),
    title: 'Query parameters',
    parameters: [
      new OasParameter({
        name: 'filter',
        location: 'query',
        description: 'Filter criteria',
        schema: new OasObject({ properties: { status: new OasString({}) } })
      })
    ]
  })

  assertEquals(
    snippet.toString(),
    '## Query parameters\n\n**filter** `object` — Filter criteria\n- **status** `string`'
  )
})

Deno.test('Parameters - renders the empty string when there are no parameters', () => {
  const snippet = new Parameters({
    context: toGenerateContext(),
    title: 'Headers',
    parameters: []
  })

  assertEquals(snippet.toString(), '')
})

// OpenAPI allows one `content` entry per parameter; this two-entry document is
// a robustness case for documents that break that rule.
Deno.test('Parameters - a content parameter renders the JSON schema when a non-JSON media type comes first', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          parameters: [
            {
              name: 'filter',
              in: 'query',
              content: {
                'text/plain': { schema: { type: 'string' } },
                'application/vnd.api+json': {
                  schema: { type: 'object', properties: { status: { type: 'string' } } }
                }
              }
            }
          ],
          responses: { '204': { description: 'No pets' } }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const snippet = new Parameters({
    context: toGenerateContext({ oasDocument: parsed }),
    title: 'Query parameters',
    parameters: parsed.value.operations[0].toParams(['query'])
  })

  assertEquals(
    snippet.toString(),
    '## Query parameters\n\n**filter** `object`\n- **status** `string`\n\nContent types: `text/plain`, `application/vnd.api+json`'
  )
})
