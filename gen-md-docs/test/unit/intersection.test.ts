/** How an `allOf` that keeps a ref renders (#117). */
import { assert, assertEquals,assertStringIncludes, assertThrows } from '@std/assert'
import type { OpenAPIV3 } from 'openapi-types'
import { intersectionCycleDocument, intersectionDocument, keepAllRefs, loopDocument, loopError } from '@skmtc/test-support'
import type { OasRef, OasSchema, SystemSettings } from '@skmtc/core'
import { Schema } from '../../src/snippets/Schema.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

const toRows = (document: OpenAPIV3.Document, name: string, system?: SystemSettings): string => {
  const parsed = toParsedDocument(document, { system })
  const schemas: Record<string, OasSchema | OasRef<'schema'>> =
    parsed.type === 'oas' ? parsed.value.components?.schemas ?? {} : {}
  const schema = schemas[name]

  assert(schema, `no schema ${name}`)

  return `${new Schema({ context: toGenerateContext({ oasDocument: parsed }), name: undefined, schema, required: undefined })}`
}

Deno.test('intersection - "All of", then each member', () => {
  assertEquals(
    toRows(intersectionDocument, 'Pet', keepAllRefs),
    '`All of`\n- [`Animal`](#type-Animal)\n- `object`\n  - **name** `string`'
  )
})

Deno.test('intersection - its own facets', () => {
  assertStringIncludes(toRows(intersectionDocument, 'Owner', keepAllRefs), '- **pet** `All of` nullable\n')
})

Deno.test('intersection - the items of an array', () => {
  assertStringIncludes(toRows(intersectionCycleDocument, 'Node'), '- **children** `All of[]` required\n  - [`Node`](#type-Node)')
})

Deno.test('intersection - additionalProperties: false is left out', () => {
  assertEquals(toRows(intersectionCycleDocument, 'Closed'), '`All of`\n- [`Base`](#type-Base)\n- `object`\n  - **b** `string`')
})

Deno.test('intersection - an inheritance loop fails and is named', () => {
  // `toParsedDocument` starts its trail at `root`, which a run does not.
  assertThrows(() => toRows(loopDocument, 'Card'), Error, loopError.replace('#/', '#/root/'))
})
