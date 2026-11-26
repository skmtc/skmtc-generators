/**
 * An `allOf` that keeps a `$ref` reaches the router as an intersection. It
 * renders each member, joined with `&`.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  inheritanceLoopDocument,
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  runE2eFixture
} from '@skmtc/test-support'
import { typescriptEntry } from '../src/mod.ts'

Deno.test('a ref and an object render as an intersection of the two', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-typescript',
    entry: typescriptEntry,
    document: intersectionDocument,
    system: keepAllRefs
  })

  assertEquals(
    artifacts['src/types/pet.generated.ts'],
    `import type {Animal} from '@/types/animal.generated.ts'\n\nexport type Pet = (Animal) & ({name?: string | undefined});\n`
  )
})

Deno.test('a ref that closes a cycle renders by name inside the intersection', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-typescript',
    entry: typescriptEntry,
    document: intersectionCycleDocument
  })

  assertStringIncludes(
    artifacts['src/types/node.generated.ts'],
    'export type Node = {name: string, children: Array<(Node) & ({extra?: string | undefined})>};'
  )
  assertStringIncludes(
    artifacts['src/types/closed.generated.ts'],
    'export type Closed = (Base) & ({b?: string | undefined});'
  )
})

// The trap: `type Payment = Card | Cash` with `type Card = (Payment) & (…)`
// renders, and fails only where the files are compiled (TS2456).
Deno.test('a model that is a member of its own union, through an intersection, fails the run by name', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-typescript',
    entry: typescriptEntry,
    document: inheritanceLoopDocument
  })

  assertEquals(Object.keys(artifacts), [])
  assertStringIncludes(
    JSON.stringify(manifest.parseIssues),
    '#/components/schemas/Payment/oneOf cannot be rendered: Payment is a member of its own allOf, oneOf or anyOf, with no property between.'
  )
})
