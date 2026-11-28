/**
 * An `allOf` that keeps a `$ref` reaches the router as an intersection. It
 * renders each member, joined with `&`.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { OasIntersection, OasObject } from '@skmtc/core'
import {
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  objectOneOfCycleDocument,
  runE2eFixture
} from '@skmtc/test-support'
import { typescriptEntry } from '../src/mod.ts'
import { toTsValue } from '../src/Ts.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

const renderIntersection = (members: OasIntersection['members']): string =>
  `${toTsValue({
    schema: new OasIntersection({ members }),
    destinationPath: '/test',
    required: true,
    context: toGenerateContext()
  })}`

// skmtc-generators#151: core keeps a `oneOf` member that closes a cycle as
// the parent's empty object and the ref. The empty object rendered as
// `Record<string, never>` and turned each property of the ref into `never`.
Deno.test('an open empty object beside a oneOf member that closes a cycle is left out', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-typescript',
    entry: typescriptEntry,
    document: objectOneOfCycleDocument
  })

  assertStringIncludes(artifacts['src/types/field.generated.ts'], `export type Field = {type: 'string'} | ArrayField;`)
})

Deno.test('a closed empty object beside a oneOf member that closes a cycle stays', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-typescript',
    entry: typescriptEntry,
    document: objectOneOfCycleDocument
  })

  assertStringIncludes(
    artifacts['src/types/closedField.generated.ts'],
    `export type ClosedField = {type: 'string'} | (Record<string, never>) & (ClosedArrayField);`
  )
})

Deno.test('an intersection with no member left renders unknown', () => {
  assertEquals(renderIntersection([]), 'unknown')
  assertEquals(renderIntersection([new OasObject({ properties: {} })]), 'unknown')
})

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
