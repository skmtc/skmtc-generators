/** A list of an `allOf` in a cycle is a list of objects (#117). */
import { assertEquals } from '@std/assert'
import { assertNoResultErrors, intersectionListDocument, runE2eFixture } from '@skmtc/test-support'
import entry from '../mod.ts'

Deno.test('intersection - a list of intersections has a select', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-shadcn-select',
    entry,
    document: intersectionListDocument
  })

  assertNoResultErrors(manifest)
  assertEquals(Object.keys(artifacts).filter(path => /\/(Subs|Pages)Select/.test(path)).length, 2)
})
