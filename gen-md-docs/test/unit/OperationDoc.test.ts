import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { toOperationDocument } from '../helpers/toOperationDocument.ts'
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

  const document = toOperationDocument({ parsed, operation: parsed.value.operations[0] })

  assertEquals(
    document,
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

  const document = toOperationDocument({ parsed, operation: parsed.value.operations[0] })

  assertStringIncludes(
    document,
    '## Request body\n\nContent types: `text/plain`, `application/vnd.api+json`\n\n`object`\n- **name** `string`'
  )
})

Deno.test("OperationDoc - notes a parameter's serialization, lists a content parameter's media type, and marks a deprecated header and a link's target", () => {
  const parsed = toParsedDocument({
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          parameters: [
            { name: 'tags', in: 'query', explode: false, schema: { type: 'array', items: { type: 'string' } } },
            { name: 'filter', in: 'query', content: { 'application/xml': { schema: { type: 'string' } } } }
          ],
          responses: {
            '200': {
              description: 'Pets',
              headers: { 'X-Old': { schema: { type: 'string' }, deprecated: true } },
              links: { next: { operationId: 'listPets', description: 'The next page' } }
            }
          }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const document = toOperationDocument({ parsed, operation: parsed.value.operations[0] })

  assertStringIncludes(document, '**tags** `string[]`\n\n_not exploded_')
  assertStringIncludes(document, '**filter** `string`\n\nContent type: `application/xml`')
  assertStringIncludes(document, '**Headers**\n\n- **X-Old** `string` _(deprecated)_')
  assertStringIncludes(document, '**Links**\n\n- **next** → `listPets` — The next page')
})
