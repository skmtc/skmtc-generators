/** A list of an `allOf` in a cycle is a list of objects (#117). */
import { assertStringIncludes } from '@std/assert'
import { assertNoResultErrors, intersectionListDocument, runE2eFixture } from '@skmtc/test-support'
import { tanstackQueryEntry } from '../src/mod.ts'

Deno.test('intersection - a list of intersections has a paginated query', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-tanstack-query-fetch-zod',
    entry: tanstackQueryEntry,
    document: intersectionListDocument
  })

  assertNoResultErrors(manifest)
  assertStringIncludes(artifacts['src/services/useGetApiSubs.generated.ts'], 'keepPreviousData')
  assertStringIncludes(artifacts['src/services/useGetApiPages.generated.ts'], 'keepPreviousData')
})
