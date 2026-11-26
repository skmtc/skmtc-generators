/**
 * An `allOf` that keeps a `$ref` reaches the router as an intersection.
 * Effect has no intersection of schemas, so the run fails and names the
 * schema. The parser merges the `allOf` when it is told to.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  inheritanceLoopDocument,
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  runE2eFixture,
} from '@skmtc/test-support'
import { effectSchemaEntry } from '../src/mod.ts'

const id = '@skmtc/gen-effect-schema'

Deno.test('an intersection fails the run, and the error names its place in the document', () => {
  const { artifacts, manifest } = runE2eFixture({
    id,
    entry: effectSchemaEntry,
    document: intersectionDocument,
    system: keepAllRefs,
  })

  assertEquals(Object.keys(artifacts), [])
  assertStringIncludes(
    JSON.stringify(manifest.parseIssues),
    '#/components/schemas/Pet/allOf is an allOf that keeps a $ref, which gen-effect-schema cannot render',
  )
})

// By default the parser keeps a ref that closes a cycle. Node's is inside
// one of its own properties, so the error names that place, not the model.
Deno.test('an intersection inside a property is named by its place in the property', () => {
  const { artifacts, manifest } = runE2eFixture({
    id,
    entry: effectSchemaEntry,
    document: intersectionCycleDocument,
  })

  assertEquals(Object.keys(artifacts), [])
  assertStringIncludes(
    JSON.stringify(manifest.parseIssues),
    '#/components/schemas/Node/properties/children/items/allOf is an allOf that keeps a $ref',
  )
})

Deno.test('an inheritance loop fails the run, and the error names the subtype', () => {
  const { artifacts, manifest } = runE2eFixture({
    id,
    entry: effectSchemaEntry,
    document: inheritanceLoopDocument,
  })

  assertEquals(Object.keys(artifacts), [])
  assertStringIncludes(
    JSON.stringify(manifest.parseIssues),
    '#/components/schemas/Card/allOf is an allOf that keeps a $ref',
  )
})

// The error names this setting, so it must give a struct.
Deno.test('with intersections set to merge, the parser merges the allOf and one struct renders', () => {
  const { artifacts } = runE2eFixture({
    id,
    entry: effectSchemaEntry,
    document: intersectionDocument,
    system: { intersections: 'merge' },
  })

  assertStringIncludes(
    artifacts['src/schema-effect/pet.generated.ts'],
    'export const Pet = Schema.Struct({kind: Schema.String, name: Schema.optional(Schema.String)});',
  )
})
