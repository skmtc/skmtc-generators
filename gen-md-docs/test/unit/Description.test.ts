import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Description } from '../../src/snippets/Description.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Description - renders the description verbatim', () => {
  const snippet = new Description({
    context: toGenerateContext(),
    description: 'Returns a single pet.'
  })

  assertEquals(snippet.toString(), 'Returns a single pet.')
})

Deno.test('Description - trims surrounding whitespace', () => {
  const snippet = new Description({
    context: toGenerateContext(),
    description: '  Returns a single pet.\n'
  })

  assertEquals(snippet.toString(), 'Returns a single pet.')
})

Deno.test('Description - renders the empty string when absent', () => {
  const snippet = new Description({
    context: toGenerateContext(),
    description: undefined
  })

  assertEquals(snippet.toString(), '')
})
