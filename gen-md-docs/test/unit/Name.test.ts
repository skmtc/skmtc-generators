import { assertEquals } from '@std/assert'
import { Name } from '../../src/snippets/Name.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Name - renders a bold name', () => {
  const snippet = new Name({ context: toGenerateContext(), name: 'id' })

  assertEquals(snippet.toString(), '**id**')
})
