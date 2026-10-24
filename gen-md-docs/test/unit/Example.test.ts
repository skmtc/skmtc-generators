import { assertEquals } from '@std/assert'
import { Example } from '@/src/snippets/Example.ts'
import { toGenerateContext } from '@/test/helpers/toGenerateContext.ts'

Deno.test('Example - renders an object as a fenced json block', () => {
  const snippet = new Example({
    context: toGenerateContext(),
    example: { value: { id: 1, name: 'Fido' } }
  })

  assertEquals(snippet.toString(), '```json\n{\n  "id": 1,\n  "name": "Fido"\n}\n```')
})

Deno.test('Example - renders a scalar inline', () => {
  const snippet = new Example({ context: toGenerateContext(), example: { value: 'active' } })

  assertEquals(snippet.toString(), 'Example: `active`')
})

Deno.test('Example - renders a number inline', () => {
  const snippet = new Example({ context: toGenerateContext(), example: { value: 42 } })

  assertEquals(snippet.toString(), 'Example: `42`')
})

Deno.test('Example - false, empty string and empty array are real examples', () => {
  const context = toGenerateContext()

  assertEquals(new Example({ context, example: { value: false } }).toString(), 'Example: `false`')
  assertEquals(new Example({ context, example: { value: '' } }).toString(), 'Example: ``')
  assertEquals(new Example({ context, example: { value: [] } }).toString(), '```json\n[]\n```')
})
