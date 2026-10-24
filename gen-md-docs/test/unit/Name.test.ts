import { assertEquals } from '@std/assert'
import { Name } from '../../src/snippets/Name.ts'
import { Maybe } from '../../src/Maybe.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Name - renders a bold name', () => {
  const snippet = new Name({ context: toGenerateContext(), name: 'id' })

  assertEquals(snippet.toString(), '**id**')
})

// A Name always renders; a root schema has no name, and its parent does not build one.
const toName = (name: string | undefined) =>
  new Maybe(name, present => new Name({ context: toGenerateContext(), name: present }))

Deno.test('Name - an absent name is not built by its parent', () => {
  assertEquals(toName(undefined).toString(), '')
  assertEquals(toName('id').toString(), '**id**')
})
