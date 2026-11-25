/** How an `allOf` that keeps a ref renders (#117). `typecheck.test.ts` checks that the files compile. */
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  intersectionCycleDocument,
  intersectionDocument,
  intersectionMembersDocument,
  keepAllRefs,
  loopDocument,
  loopError,
  requiredBranchesDocument,
  requiredBranchesError,
  requiredKeysDocument,
  requiredLoopDocument,
  requiredLoopError,
  requiredThroughModelDocuments,
  runE2eFixture,
  toRunError,
  toSchemasDocument
} from '@skmtc/test-support'
import { typescriptEntry } from '../src/mod.ts'

const id = '@skmtc/gen-typescript'
const entry = typescriptEntry

const { artifacts } = runE2eFixture({ id, entry, document: intersectionDocument, system: keepAllRefs })
const { artifacts: members } = runE2eFixture({ id, entry, document: intersectionMembersDocument, system: keepAllRefs })
const { artifacts: cycles } = runE2eFixture({ id, entry, document: intersectionCycleDocument })

Deno.test('intersection - a ref and an object', () => {
  assertStringIncludes(artifacts['src/types/pet.generated.ts'], 'export type Pet = Animal & {name?: string | undefined};')
})

Deno.test('intersection - a nullable one in a property', () => {
  assertStringIncludes(artifacts['src/types/owner.generated.ts'], 'pet?: ({name?: string | undefined} & Animal | null) | undefined')
})

Deno.test('intersection - a union member is in parentheses, as & binds tighter than |', () => {
  assertStringIncludes(members['src/types/tagged.generated.ts'], 'export type Tagged = Animal & ({a: string} | {b: string});')
})

// The trap: an object with no keys renders `Record<string, never>`, which
// refuses the keys of the other members.
Deno.test('intersection - a member with no keys of its own renders {}', () => {
  assertStringIncludes(members['src/types/filled.generated.ts'], 'export type Filled = Animal & {};')
  assertStringIncludes(members['src/types/either.generated.ts'], 'export type Either = Animal & ({} | {});')
  assertStringIncludes(members['src/types/marked.generated.ts'], 'export type Marked = {} & {name?: string | undefined};')
})

Deno.test('intersection - a key that one member requires and another declares is required', () => {
  assertStringIncludes(members['src/types/named.generated.ts'], 'export type Named = Animal & {kind: string};')
})

// Without the check, the stack overflows.
Deno.test('intersection - a required property that holds the intersection fails and is named', () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: requiredLoopDocument })), requiredLoopError)
})

Deno.test('intersection - a key required by a reference, or declared by a union, is required', () => {
  const { artifacts } = runE2eFixture({ id, entry, document: requiredKeysDocument })

  assertStringIncludes(artifacts['src/types/sub.generated.ts'], "export type Sub = Base & {kind: 'a'};")
  assertStringIncludes(artifacts['src/types/both.generated.ts'], 'export type Both = NeedsId & HasId & {id: string};')
  assertStringIncludes(artifacts['src/types/narrowed.generated.ts'], 'export type Narrowed = Choice & {id: string};')
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: requiredBranchesDocument })), requiredBranchesError)
})

for (const [order, document] of Object.entries(requiredThroughModelDocuments)) {
  Deno.test(`intersection - a required property that holds one of another model renders, ${order}`, () => {
    assertStringIncludes(
      runE2eFixture({ id, entry, document }).artifacts['src/types/employee.generated.ts'],
      'export type Employee = Person & {id?: string | undefined, manager: Employee & unknown};'
    )
  })
}

// The empty branch is not built, so nothing imports the model.
Deno.test('intersection - a branch that is an empty model leaves no import', () => {
  const { artifacts } = runE2eFixture({
    id,
    entry,
    document: toSchemasDocument({
      Animal: { type: 'object', properties: { kind: { type: 'string' } } },
      Marker: { type: 'object' },
      Either: {
        allOf: [
          { $ref: '#/components/schemas/Animal' },
          { anyOf: [{ $ref: '#/components/schemas/Marker' }, { type: 'object', properties: { a: { type: 'string' } } }] }
        ]
      }
    }),
    system: keepAllRefs
  })

  assertEquals(artifacts['src/types/either.generated.ts'].includes('Marker'), false)
})

Deno.test('intersection - a member that is any value', () => {
  assertStringIncludes(members['src/types/noted.generated.ts'], 'export type Noted = Animal & unknown & {};')
})

Deno.test('intersection - a ref that closes a cycle through a property', () => {
  assertStringIncludes(
    cycles['src/types/node.generated.ts'],
    'export type Node = {name: string, children: Array<Node & {extra?: string | undefined}>};'
  )
})

Deno.test('intersection - additionalProperties: false is left out', () => {
  assertStringIncludes(cycles['src/types/closed.generated.ts'], 'export type Closed = Base & {b?: string | undefined};')
})

Deno.test('intersection - an inheritance loop fails and is named', () => {
  assertStringIncludes(toRunError(runE2eFixture({ id, entry, document: loopDocument })), loopError)
})
