import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Enums } from '../../src/snippets/Enums.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('Enums - renders string values as inline code', () => {
  const snippet = new Enums({
    context: toGenerateContext(),
    enums: ['active', 'inactive']
  })

  assertEquals(snippet.toString(), '(`active`, `inactive`)')
})

Deno.test('Enums - renders non-string values via String()', () => {
  const snippet = new Enums({
    context: toGenerateContext(),
    enums: [1, 2, true]
  })

  assertEquals(snippet.toString(), '(`1`, `2`, `true`)')
})

Deno.test('Enums - renders the empty string when there are no enums', () => {
  const snippet = new Enums({
    context: toGenerateContext(),
    enums: undefined
  })

  assertEquals(snippet.toString(), '')
})

Deno.test('Enums - renders the empty string for an empty array', () => {
  const snippet = new Enums({
    context: toGenerateContext(),
    enums: []
  })

  assertEquals(snippet.toString(), '')
})
