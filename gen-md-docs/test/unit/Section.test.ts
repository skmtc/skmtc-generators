import { assertEquals } from '@std/assert'
import { OasNumber, OasObject, OasString } from '@skmtc/core'
import { Section } from '../../src/snippets/Section.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { Loop, Maybe } from '../../src/Maybe.ts'

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

// A Section always renders; the operation builds one only when there is a
// schema or a non-blank description.
const toSection = (schema: OasString | undefined, description: string | undefined) =>
  new Maybe(
    new Loop([schema, Maybe.nonEmptyText(description?.trim(), text => text)]),
    () => new Section({ context: toGenerateContext(), title: 'Request body', schema, description })
  )

Deno.test('Section - not built with neither schema nor description', () => {
  assertEquals(toSection(undefined, undefined).toString(), '')
  assertEquals(toSection(undefined, '  ').toString(), '')
  assertEquals(toSection(undefined, 'Pet to add.').toString(), '## Request body\n\nPet to add.')
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

  // A plain single application/json is left unannotated: `toContent` lists no
  // media types for it, so the section receives an empty list.
  const json = new Section({
    context: toGenerateContext(),
    title: 'Request body',
    schema: new OasString({}),
    description: undefined,
    mediaTypes: []
  })
  assertEquals(json.toString(), '## Request body\n\n`string`')
})
