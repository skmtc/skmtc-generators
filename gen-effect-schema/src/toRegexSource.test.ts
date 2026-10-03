import { assertEquals } from '@std/assert'
import { toRegexSource } from './toRegexSource.ts'

Deno.test('escapes a bare slash and leaves an escaped one alone', () => {
  assertEquals(toRegexSource('^https://'), '^https:\\/\\/')
  assertEquals(toRegexSource('^https:\\/\\/'), '^https:\\/\\/')
})

Deno.test('a slash inside a character class needs no escape', () => {
  assertEquals(toRegexSource('^[a-z/]+$'), '^[a-z/]+$')
})

Deno.test('a regex literal built from it is the pattern', () => {
  const source = toRegexSource('^https:\\/\\/x/y$')
  const regex = new RegExp(source)

  assertEquals(regex.test('https://x/y'), true)
  assertEquals(regex.source, '^https:\\/\\/x\\/y$')
})
