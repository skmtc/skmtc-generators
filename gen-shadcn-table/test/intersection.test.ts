/** A list of an `allOf` in a cycle is a list of objects (#117). */
import { assertEquals } from '@std/assert'
import { assertNoResultErrors, intersectionListDocument, runE2eFixture } from '@skmtc/test-support'
import { ShadcnTableEntry } from '../src/mod.ts'

Deno.test('intersection - a list of intersections has a table', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-shadcn-table',
    entry: ShadcnTableEntry,
    document: intersectionListDocument
  })

  assertNoResultErrors(manifest)
  assertEquals(Object.keys(artifacts).filter(path => path.startsWith('src/tables/')).sort(), [
    'src/tables/PagesTable.generated.tsx',
    'src/tables/SubsTable.generated.tsx'
  ])
})
