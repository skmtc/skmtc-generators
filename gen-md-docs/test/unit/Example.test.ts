import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Example } from '../../src/snippets/Example.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Example - renders an object as a fenced json block', () => {
  const snippet = new Example({
    context: toGenerateContext(),
    example: { id: 1, name: 'Fido' }
  })

  assertEquals(snippet.toString(), '```json\n{\n  "id": 1,\n  "name": "Fido"\n}\n```')
})

Deno.test('Example - renders a scalar inline', () => {
  const snippet = new Example({ context: toGenerateContext(), example: 'active' })

  assertEquals(snippet.toString(), 'Example: `active`')
})

Deno.test('Example - renders a number inline', () => {
  const snippet = new Example({ context: toGenerateContext(), example: 42 })

  assertEquals(snippet.toString(), 'Example: `42`')
})

Deno.test('Example - renders the empty string when the example is absent', () => {
  const snippet = new Example({ context: toGenerateContext(), example: undefined })

  assertEquals(snippet.toString(), '')
})

Deno.test('Example - renders the empty string for a null example', () => {
  const snippet = new Example({ context: toGenerateContext(), example: null })

  assertEquals(snippet.toString(), '')
})
