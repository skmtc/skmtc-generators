/** How an `allOf` that keeps a ref renders (#117). `typecheck.test.ts` checks that the files compile and what they parse. */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  intersectionDocument,
  intersectionMembersDocument,
  keepAllRefs,
  loopDocument,
  loopError,
  runE2eFixture,
  toRunError,
  toSchemasDocument
} from '@skmtc/test-support'
import { arktypeEntry } from '../src/mod.ts'

const id = '@skmtc/gen-arktype'
const entry = arktypeEntry

const { artifacts } = runE2eFixture({ id, entry, document: intersectionDocument, system: keepAllRefs })

Deno.test('intersection - a ref and an object', () => {
  assertStringIncludes(artifacts['src/types/pet.generated.ts'], 'export const pet = animal.and({ "name?": "string" });')

  // No `type(…)` is around it, so nothing uses the import.
  assertEquals(artifacts['src/types/pet.generated.ts'].includes("from 'arktype'"), false)
})

Deno.test('intersection - a definition first is made a Type, which has .and', () => {
  assertStringIncludes(
    artifacts['src/types/owner.generated.ts'],
    '"pet?": [type({ "name?": "string" }).and(animal), "|", "null"]'
  )
})

Deno.test('intersection - a key that one member requires and another declares is required', () => {
  const { artifacts } = runE2eFixture({ id, entry, document: intersectionMembersDocument, system: keepAllRefs })

  assertStringIncludes(artifacts['src/types/named.generated.ts'], 'export const named = animal.and({ kind: "string" });')
})

Deno.test('intersection - a key that one reference requires and another declares is required', () => {
  const { artifacts } = runE2eFixture({
    id,
    entry,
    document: toSchemasDocument({
      NeedsId: { type: 'object', required: ['id'], properties: {} },
      HasId: { type: 'object', properties: { id: { type: 'string' } } },
      Both: { allOf: [{ $ref: '#/components/schemas/NeedsId' }, { $ref: '#/components/schemas/HasId' }] }
    }),
    system: keepAllRefs
  })

  assertStringIncludes(artifacts['src/types/both.generated.ts'], 'needsId.and(hasId).and({ id: "string" });')
})

Deno.test('intersection - an inheritance loop fails and is named', () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: loopDocument })), loopError)
})
