import { assertEquals } from '@std/assert'
import { Description, DescriptionClause } from '../../src/snippets/Description.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Description - renders the description verbatim', () => {
  const snippet = new Description({
    context: toGenerateContext(),
    description: 'Returns a single pet.'
  })

  assertEquals(snippet.toString(), 'Returns a single pet.')
})

Deno.test('DescriptionClause - renders the description after an em dash, for the end of a row', () => {
  const snippet = new DescriptionClause({ context: toGenerateContext(), description: 'The pet identifier' })

  assertEquals(snippet.toString(), '— The pet identifier')
})
