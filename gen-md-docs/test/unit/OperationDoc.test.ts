import { assert, assertEquals } from 'jsr:@std/assert@^1.0.0'
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
