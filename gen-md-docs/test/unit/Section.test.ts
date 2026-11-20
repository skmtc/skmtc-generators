import { assert, assertEquals } from '@std/assert'
import { OasNumber, OasObject, OasString } from '@skmtc/core'
import { Section } from '../../src/snippets/Section.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'
import { toContent } from '../../src/toContent.ts'

/** The document the snippets are written in, suffixed as the engine names a projection's file. */
const DOC = '@/docs/test.generated.md'

Deno.test('Section - renders heading, schema and a collated example', () => {
  const snippet = new Section({
    context: toGenerateContext(),
    destinationPath: DOC,
    title: 'Request body',
    schema: new OasObject({ properties: { id: new OasNumber({ example: 1 }) }, required: ['id'] }),
    description: undefined,
    mediaTypes: []
  })

  assertEquals(
    snippet.toString(),
    '## Request body\n\n`object`\n- **id** `number` required\n\n```json\n{\n  "id": 1\n}\n```'
  )
})

Deno.test('Section - omits the example block when there are no examples', () => {
  const snippet = new Section({
    context: toGenerateContext(),
    destinationPath: DOC,
    title: 'Request body',
    schema: new OasObject({ properties: { id: new OasNumber({}) } }),
    description: undefined,
    mediaTypes: []
  })

  assertEquals(snippet.toString(), '## Request body\n\n`object`\n- **id** `number`')
})

Deno.test('Section - renders a description without a schema', () => {
  const snippet = new Section({
    context: toGenerateContext(),
    destinationPath: DOC,
    title: 'Response',
    schema: undefined,
    description: 'Pet found.',
    mediaTypes: []
  })

  assertEquals(snippet.toString(), '## Response\n\nPet found.')
})

Deno.test('Section - lists the media types it is given', () => {
  const binary = new Section({
    context: toGenerateContext(),
    destinationPath: DOC,
    title: 'Request body',
    schema: new OasString({ format: 'binary' }),
    description: undefined,
    mediaTypes: ['application/octet-stream']
  })

  assertEquals(
    binary.toString(),
    '## Request body\n\nContent type: `application/octet-stream`\n\n`string` binary'
  )
})

Deno.test('toContent - lists a non-JSON media type, but not a plain single application/json', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/upload': {
        post: {
          requestBody: { content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
          responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string' } } } } }
        }
      }
    }
  })
  assert(parsed.type === 'oas')
  const [operation] = parsed.value.operations
  assert(operation !== undefined)

  const requestBody = operation.requestBody
  assert(requestBody !== undefined && !requestBody.isRef())
  assertEquals(toContent(requestBody.content).listedMediaTypes, ['application/octet-stream'])

  const response = operation.responses['200']
  assert(response !== undefined && !response.isRef())
  assertEquals(toContent(response.content).listedMediaTypes, [])
})
