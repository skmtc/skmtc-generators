import { assertEquals } from '@std/assert'
import { toExampleBlock } from '../../src/snippets/Example.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Example - renders an object as a fenced json block', () => {
  const snippet = toExampleBlock({ context: toGenerateContext(), example: { id: 1, name: 'Fido' } })

  assertEquals(snippet?.toString(), '```json\n{\n  "id": 1,\n  "name": "Fido"\n}\n```')
})

Deno.test('Example - renders a scalar inline', () => {
  const snippet = toExampleBlock({ context: toGenerateContext(), example: 'active' })

  assertEquals(snippet?.toString(), 'Example: `active`')
})

Deno.test('Example - renders a number inline', () => {
  const snippet = toExampleBlock({ context: toGenerateContext(), example: 42 })

  assertEquals(snippet?.toString(), 'Example: `42`')
})

Deno.test('Example - there is no block when the example is absent', () => {
  const snippet = toExampleBlock({ context: toGenerateContext(), example: undefined })

  assertEquals(snippet, undefined)
})

Deno.test('Example - there is no block for a null example', () => {
  const snippet = toExampleBlock({ context: toGenerateContext(), example: null })

  assertEquals(snippet, undefined)
})
