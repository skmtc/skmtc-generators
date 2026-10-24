import { assertEquals } from '@std/assert'
import { Description } from '../../src/snippets/Description.ts'
import { Maybe } from '../../src/Maybe.ts'
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

// A Description always renders; the parent decides presence. An absent or
// blank description is never built, so nothing renders and no separator is left.
const toDescription = (description: string | undefined) =>
  new Maybe(
    description?.trim(),
    text => new Description({ context: toGenerateContext(), description: text })
  )

Deno.test('Description - an absent or blank description is not built by its parent', () => {
  assertEquals(toDescription(undefined).toString(), '')
  assertEquals(toDescription('  \n').toString(), '')
  assertEquals(toDescription('Returns a single pet.').toString(), 'Returns a single pet.')
})
