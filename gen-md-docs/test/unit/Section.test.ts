import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { OasNumber, OasObject, OasString } from '@skmtc/core'
import { Section } from '../../src/snippets/Section.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Section - renders heading, schema and a collated example', () => {
  const snippet = new Section({
    context: toGenerateContext(),
    title: 'Request body',
    schema: new OasObject({ properties: { id: new OasNumber({ example: 1 }) }, required: ['id'] }),
    description: undefined
  })

  assertEquals(
    snippet.toString(),
    '## Request body\n\n`object`\n- **id** `number` required\n\n```json\n{\n  "id": 1\n}\n```'
  )
})

Deno.test('Section - omits the example block when there are no examples', () => {
  const snippet = new Section({
    context: toGenerateContext(),
    title: 'Request body',
    schema: new OasObject({ properties: { id: new OasNumber({}) } }),
    description: undefined
  })

  assertEquals(snippet.toString(), '## Request body\n\n`object`\n- **id** `number`')
})

Deno.test('Section - renders a description without a schema', () => {
  const snippet = new Section({
    context: toGenerateContext(),
    title: 'Response',
    schema: undefined,
    description: 'Pet found.'
  })

  assertEquals(snippet.toString(), '## Response\n\nPet found.')
})

Deno.test('Section - renders the empty string with neither schema nor description', () => {
  const snippet = new Section({
    context: toGenerateContext(),
    title: 'Request body',
    schema: undefined,
    description: undefined
  })

  assertEquals(snippet.toString(), '')
})

Deno.test('Section - annotates a non-JSON content type, but not plain application/json', () => {
  const binary = new Section({
    context: toGenerateContext(),
    title: 'Request body',
    schema: new OasString({ format: 'binary' }),
    description: undefined,
    mediaTypes: ['application/octet-stream']
  })
  assertEquals(
    binary.toString(),
    '## Request body\n\nContent type: `application/octet-stream`\n\n`string` binary'
  )

  // A plain single application/json is left unannotated.
  const json = new Section({
    context: toGenerateContext(),
    title: 'Request body',
    schema: new OasString({}),
    description: undefined,
    mediaTypes: ['application/json']
  })
  assertEquals(json.toString(), '## Request body\n\n`string`')
})
