import { assertEquals } from '@std/assert'
import { PathMethod } from '@/src/snippets/PathMethod.ts'
import { toGenerateContext } from '@/test/helpers/toGenerateContext.ts'

Deno.test('PathMethod - renders the uppercased method and the path as inline code', () => {
  const snippet = new PathMethod({
    context: toGenerateContext(),
    method: 'get',
    path: '/pets/{id}'
  })

  assertEquals(snippet.toString(), '`GET` `/pets/{id}`')
})
