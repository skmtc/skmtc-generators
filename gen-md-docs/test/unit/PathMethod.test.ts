import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { PathMethod } from '../../src/snippets/PathMethod.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('PathMethod - renders the uppercased method and the path as inline code', () => {
  const snippet = new PathMethod({
    context: toGenerateContext(),
    method: 'get',
    path: '/pets/{id}'
  })

  assertEquals(snippet.toString(), '`GET` `/pets/{id}`')
})
