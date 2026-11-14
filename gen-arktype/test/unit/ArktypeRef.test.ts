import { assertEquals, assertThrows } from '@std/assert'
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
    Category: { type: 'string' as const },
    Node: {
      type: 'object' as const,
      properties: { child: { $ref: '#/components/schemas/Node' } }
    },
    Employee: {
      type: 'object' as const,
      properties: { team: { $ref: '#/components/schemas/Team' } }
    },
    Team: {
      type: 'object' as const,
      properties: {
        members: { type: 'array' as const, items: { $ref: '#/components/schemas/Employee' } }
      }
    }
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

// A lone `type(…)` reads a plain reference when its module loads and runs a
// thunk while it parses, so either spelling of a reference back throws at run
// time. The generator refuses the model instead of emitting that.
Deno.test('ArktypeRef - a model that refers to itself is refused, by name', () => {
  assertThrows(
    () =>
      new ArktypeRef({
        context: toRefContext(),
        refName: 'Node' as RefName,
        modifiers: { required: true },
        destinationPath: '/test'
      }),
    Error,
    'Node is recursive, which gen-arktype cannot render'
  )
})

Deno.test('ArktypeRef - a cycle of two models is refused, naming the model referred back to', () => {
  assertThrows(
    () =>
      new ArktypeRef({
        context: toRefContext(),
        refName: 'Employee' as RefName,
        modifiers: { required: true },
        destinationPath: '/test'
      }),
    Error,
    'Employee is recursive, which gen-arktype cannot render'
  )
})
