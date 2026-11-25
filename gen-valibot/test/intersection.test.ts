/** How an `allOf` that keeps a ref renders (#117). `typecheck.test.ts` checks that the files compile and what they parse. */
import { assertStringIncludes } from '@std/assert'
import {
  intersectionCycleDocument,
  intersectionDocument,
  intersectionMembersDocument,
  keepAllRefs,
  loopDocument,
  loopError,
  requiredLoopDocument,
  requiredLoopError,
  runE2eFixture,
  toRunError
} from '@skmtc/test-support'
import { valibotEntry } from '../src/mod.ts'

const id = '@skmtc/gen-valibot'
const entry = valibotEntry

const { artifacts } = runE2eFixture({ id, entry, document: intersectionDocument, system: keepAllRefs })
const { artifacts: cycles } = runE2eFixture({ id, entry, document: intersectionCycleDocument })

Deno.test('intersection - a ref and an object', () => {
  assertStringIncludes(
    artifacts['src/types/pet.generated.ts'],
    'export const pet = v.intersect([animal, v.object({name: v.optional(v.string())})]);'
  )
})

Deno.test('intersection - a nullable one in a property', () => {
  assertStringIncludes(
    artifacts['src/types/owner.generated.ts'],
    'pet: v.optional(v.nullable(v.intersect([v.object({name: v.optional(v.string())}), animal])))'
  )
})

Deno.test('intersection - a discriminated union of intersections renders v.union', () => {
  assertStringIncludes(artifacts['src/types/payment.generated.ts'], 'export const payment = v.union([card, bank]);')
})

Deno.test('intersection - a ref that closes a cycle through a property', () => {
  assertStringIncludes(
    cycles['src/types/node.generated.ts'],
    'export const node: v.GenericSchema<Node> = v.object({name: v.string(), children: v.array(v.intersect([v.lazy(() => node), v.object({extra: v.optional(v.string())})]))});'
  )
})

Deno.test('intersection - additionalProperties: false is left out', () => {
  assertStringIncludes(
    cycles['src/types/closed.generated.ts'],
    'export const closed = v.intersect([v.lazy(() => base), v.object({b: v.optional(v.string())})]);'
  )
})

Deno.test('intersection - a key that one member requires and another declares is required', () => {
  const { artifacts } = runE2eFixture({ id, entry, document: intersectionMembersDocument, system: keepAllRefs })

  assertStringIncludes(
    artifacts['src/types/named.generated.ts'],
    'export const named = v.intersect([animal, v.object({kind: v.string()})]);'
  )
})

// Without the check, the stack overflows.
Deno.test('intersection - a required property that holds the intersection fails and is named', () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: requiredLoopDocument })), requiredLoopError)
})

Deno.test('intersection - an inheritance loop fails and is named', () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: loopDocument })), loopError)
})
