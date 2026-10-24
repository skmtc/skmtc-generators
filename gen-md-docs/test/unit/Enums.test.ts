import { assertEquals } from '@std/assert'
import { Enums } from '../../src/snippets/Enums.ts'
import { Maybe } from '../../src/Maybe.ts'
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

// Enums always renders; the parent decides presence. Missing or empty allowed
// values (an empty array is absent) are never built.
const toEnums = (enums: readonly unknown[] | undefined) =>
  Maybe.nonEmpty(enums, values => new Enums({ context: toGenerateContext(), enums: values }))

Deno.test('Enums - missing or empty allowed values are not built by the parent', () => {
  assertEquals(toEnums(undefined).toString(), '')
  assertEquals(toEnums([]).toString(), '')
  assertEquals(toEnums(['active']).toString(), '(`active`)')
})
