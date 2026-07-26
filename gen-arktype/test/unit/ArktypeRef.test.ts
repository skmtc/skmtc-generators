import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeRef } from '@skmtc/gen-arktype'
import { type RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

/**
 * A ref drives the referenced model through `ModelDriver`, so every case needs
 * a parsed document to resolve against — constructing one against an empty
 * document would only prove the constructor runs.
 */
const toRefContext = () => {
  const schemas = {
    User: {
      type: 'object' as const,
      properties: { name: { type: 'string' as const } },
      required: ['name']
    },
    Product: { type: 'string' as const },
    Category: { type: 'string' as const }
  }

  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(new StackTrail(['TEST']))

  return toGenerateContext({ oasDocument })
}

Deno.test('ArktypeRef - basic reference', () => {
  const arktypeRef = new ArktypeRef({
    context: toRefContext(),
    refName: 'User' as RefName,
    modifiers: { required: true },
    destinationPath: '/test'
  })

  assertEquals(arktypeRef.toString(), 'user')
})

Deno.test('ArktypeRef - nullable reference', () => {
  const arktypeRef = new ArktypeRef({
    context: toRefContext(),
    refName: 'Product' as RefName,
    modifiers: { required: true, nullable: true },
    destinationPath: '/test'
  })

  // Not `type("product | null")` — a name is unresolvable in arktype's string
  // syntax, so the union has to be built as a value.
  assertEquals(arktypeRef.toString(), '[product, "|", "null"]')
})

Deno.test('ArktypeRef - optional reference', () => {
  const arktypeRef = new ArktypeRef({
    context: toRefContext(),
    refName: 'Category' as RefName,
    modifiers: { required: false },
    destinationPath: '/test'
  })

  assertEquals(arktypeRef.toString(), '[category, "|", "undefined"]')
})

Deno.test('ArktypeRef - drives the referenced model into its own file', () => {
  const context = toRefContext()

  new ArktypeRef({
    context,
    refName: 'User' as RefName,
    modifiers: { required: true },
    destinationPath: '/test'
  })

  // The point of `ModelDriver`: the reference cannot dangle, because resolving
  // it is what builds the model.
  assertEquals(
    Boolean(context.findDefinition({ name: 'user', exportPath: '@/types/user.generated.ts' })),
    true
  )
})
