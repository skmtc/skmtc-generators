import { assert, assertFalse } from '@std/assert'
import { OasComponents, OasDocument, OasInfo, OasObject, OasRef, OasUnion, StackTrail, type RefName } from '@skmtc/core'
import { openModel, repeatsModel } from '../src/openModels.ts'

// The parser turns a one-member `oneOf`, `anyOf` or `allOf` into its member, so
// a full run never reaches this branch. `schemaToField` unwraps the union, and
// `repeatsModel` must answer for the same member.
Deno.test('repeatsModel - a one-member union repeats the model its member repeats', () => {
  const ref = new OasRef<'schema'>(
    { refType: 'schema', $ref: '#/components/schemas/Node' },
    {
      parsedDocument: {
        type: 'oas',
        value: new OasDocument({
          openapi: '3.0.0',
          info: new OasInfo({ title: 'Fixture API', version: '1.0.0' }),
          operations: [],
          components: new OasComponents({ schemas: { ['Node' as RefName]: new OasObject({}) } })
        })
      },
      currentStackTrail: new StackTrail([])
    }
  )
  const schema = new OasUnion({ members: [ref] })

  assert(repeatsModel({ schema, openModels: openModel({ schema: ref, openModels: new Set() }) }))
  assertFalse(repeatsModel({ schema, openModels: new Set() }))
})
