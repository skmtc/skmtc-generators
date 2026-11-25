/** A list of an `allOf` in a cycle is a list of objects (#117). */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { OasIntersection, OasObject, OasString, OasUnknown } from '@skmtc/core'
import { assertNoResultErrors, intersectionListDocument, runE2eFixture } from '@skmtc/test-support'
import { tanstackQueryEntry } from '../src/mod.ts'
import { toObjectSchema } from '../src/toObjectSchema.ts'

Deno.test('intersection - a list of intersections has a paginated query', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-tanstack-query-supabase-zod',
    entry: tanstackQueryEntry,
    document: intersectionListDocument
  })

  assertNoResultErrors(manifest)
  assertStringIncludes(artifacts['src/services/useGetApiSubs.generated.ts'], 'keepPreviousData')
  assertStringIncludes(artifacts['src/services/useGetApiPages.generated.ts'], 'keepPreviousData')
})

Deno.test('toObjectSchema - an intersection of objects has the keys of all of them', () => {
  const a = new OasObject({ properties: { a: new OasString({}), both: new OasString({}) }, required: ['a'] })
  const b = new OasObject({ properties: { b: new OasString({}), both: new OasUnknown({}) }, required: ['a', 'b'] })
  const object = toObjectSchema(new OasIntersection({ members: [a, b, new OasUnknown({})] }))

  assertEquals(Object.keys(object?.properties ?? {}), ['a', 'both', 'b'])
  assertEquals(object?.properties?.both.type, 'string')
  assertEquals(object?.required, ['a', 'b'])
})

Deno.test('toObjectSchema - an intersection with a member of another type is not an object', () => {
  assertEquals(toObjectSchema(new OasIntersection({ members: [new OasObject({}), new OasString({})] })), undefined)
  assertEquals(toObjectSchema(new OasIntersection({ members: [new OasUnknown({})] })), undefined)
})
