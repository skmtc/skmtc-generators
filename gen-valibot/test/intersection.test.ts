/**
 * An `allOf` that keeps a `$ref` reaches the router as an intersection. It
 * renders `v.intersect` of its members.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  inheritanceLoopDocument,
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  runE2eFixture
} from '@skmtc/test-support'
import { valibotEntry } from '../src/mod.ts'

Deno.test('a ref and an object render as an intersection of the two', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-valibot',
    entry: valibotEntry,
    document: intersectionDocument,
    system: keepAllRefs
  })

  assertEquals(
    artifacts['src/types/pet.generated.ts'],
    `import * as v from 'valibot'\nimport {animal} from '@/types/animal.generated.ts'\n\nexport const pet = v.intersect([animal, v.object({name: v.optional(v.string())})]);\n`
  )
})

// The trap: `v.variant` types its options as objects, and fails at parse for
// an intersection. An intersection has no `variantKeys`, so `v.union` renders.
Deno.test('a discriminated union of intersections renders as a plain union', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-valibot',
    entry: valibotEntry,
    document: intersectionDocument,
    system: keepAllRefs
  })

  assertStringIncludes(artifacts['src/types/payment.generated.ts'], 'export const payment = v.union([card, bank]);')
})

Deno.test('a ref that closes a cycle is lazy inside the intersection', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-valibot',
    entry: valibotEntry,
    document: intersectionCycleDocument
  })

  assertStringIncludes(
    artifacts['src/types/node.generated.ts'],
    'export const node: v.GenericSchema<Node> = v.object({name: v.string(), children: v.array(v.intersect([v.lazy(() => node), v.object({extra: v.optional(v.string())})]))});'
  )
  assertStringIncludes(
    artifacts['src/types/closed.generated.ts'],
    'v.intersect([v.lazy(() => base), v.object({b: v.optional(v.string())})]);'
  )
})

// The trap: the schemas render and load, as each reference is `v.lazy`. The
// first parse of one never ends, and the type one is annotated with does
// not compile. gen-typescript, which writes that type, refuses the loop.
Deno.test('a model that is a member of its own union, through an intersection, fails the run by name', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-valibot',
    entry: valibotEntry,
    document: inheritanceLoopDocument
  })

  assertEquals(Object.keys(artifacts), [])
  assertStringIncludes(
    JSON.stringify(manifest.parseIssues),
    '#/components/schemas/Payment/oneOf cannot be rendered: Payment is a member of its own allOf, oneOf or anyOf, with no property between.'
  )
})
