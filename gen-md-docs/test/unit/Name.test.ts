import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Name } from '../../src/snippets/Name.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Name - renders a bold name', () => {
  const snippet = new Name({ context: toGenerateContext(), name: 'id' })

  assertEquals(snippet.toString(), '**id**')
})

Deno.test('Name - renders the empty string when the name is absent', () => {
  const snippet = new Name({ context: toGenerateContext(), name: undefined })

  assertEquals(snippet.toString(), '')
})
