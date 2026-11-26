/**
 * An `allOf` that keeps a `$ref` reaches the router as an intersection. It
 * renders arktype's `[left, "&", right]` tuple.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  assertHasResultError,
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  runE2eFixture
} from '@skmtc/test-support'
import { arktypeEntry } from '../src/mod.ts'

Deno.test('a ref and an object render as an intersection of the two', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-arktype',
    entry: arktypeEntry,
    document: intersectionDocument,
    system: keepAllRefs
  })

  assertEquals(
    artifacts['src/types/pet.generated.ts'],
    `import {animal} from '@/types/animal.generated.ts'\nimport {type} from 'arktype'\n\nexport const pet = type([animal, "&", { "name?": "string" }]);\n`
  )
})

// By default the parser keeps only a ref that closes a cycle, and
// gen-arktype renders no cycle (see ArktypeRef). So an intersection renders
// only when the parser keeps every ref.
Deno.test('an intersection with a ref that closes a cycle fails as any recursive model does', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-arktype',
    entry: arktypeEntry,
    document: intersectionCycleDocument
  })

  assertEquals(Object.keys(artifacts), [])
  assertHasResultError(manifest)
  assertStringIncludes(JSON.stringify(manifest.parseIssues), 'Node is recursive, which gen-arktype cannot render')
})
