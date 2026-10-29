import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { OperationDoc } from '../../src/snippets/OperationDoc.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

Deno.test('OperationDoc - composes the full operation document', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/pets/{id}': {
        get: {
          summary: 'Get pet by ID',
          description: 'Returns a single pet.',
          tags: ['pets'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'The pet identifier',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'A pet',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { id: { type: 'integer' }, name: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const snippet = new OperationDoc({
    context: toGenerateContext({ oasDocument: parsed }),
    operation: parsed.value.operations[0]
  })

  assertEquals(
    snippet.toString(),
    [
      '---\ntype: operation\ntitle: "Get pet by ID"\nmethod: GET\npath: "/pets/{id}"\ntags:\n  - "pets"\n---',
      '# Get pet by ID',
      'Returns a single pet.',
      '`GET` `/pets/{id}`',
      '## Path parameters',
      '**id** `string` required — The pet identifier',
      '## Responses',
      '### `200` — A pet',
      '`object`\n- **id** `integer`\n- **name** `string`'
    ].join('\n\n')
  )
})

Deno.test('OperationDoc - renders the JSON request body schema when a non-JSON media type comes first', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/pets': {
        post: {
          summary: 'Create a pet',
          requestBody: {
            content: {
              'text/plain': { schema: { type: 'string' } },
              'application/vnd.api+json': {
                schema: { type: 'object', properties: { name: { type: 'string' } } }
              }
            }
          },
          responses: { '204': { description: 'Created' } }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const snippet = new OperationDoc({
    context: toGenerateContext({ oasDocument: parsed }),
    operation: parsed.value.operations[0]
  })

  assertStringIncludes(
    snippet.toString(),
    '## Request body\n\nContent types: `text/plain`, `application/vnd.api+json`\n\n`object`\n- **name** `string`'
  )
})
