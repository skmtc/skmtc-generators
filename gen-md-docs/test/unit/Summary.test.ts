import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Summary } from '../../src/snippets/Summary.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Summary - renders the summary as a heading above the description', () => {
  const snippet = new Summary({
    context: toGenerateContext(),
    summary: 'Get pet by ID',
    description: 'Returns a single pet.'
  })

  assertEquals(snippet.toString(), '# Get pet by ID\n\nReturns a single pet.')
})

Deno.test('Summary - renders just the heading when there is no description', () => {
  const snippet = new Summary({
    context: toGenerateContext(),
    summary: 'Get pet by ID',
    description: undefined
  })

  assertEquals(snippet.toString(), '# Get pet by ID')
})

Deno.test('Summary - renders just the description when there is no summary', () => {
  const snippet = new Summary({
    context: toGenerateContext(),
    summary: undefined,
    description: 'Returns a single pet.'
  })

  assertEquals(snippet.toString(), 'Returns a single pet.')
})

Deno.test('Summary - renders the empty string when both are absent', () => {
  const snippet = new Summary({
    context: toGenerateContext(),
    summary: undefined,
    description: undefined
  })

  assertEquals(snippet.toString(), '')
})
