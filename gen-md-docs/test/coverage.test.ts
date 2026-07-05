/**
 * Layer 2 — completeness against the source spec. Nothing is silently dropped:
 * every operation is documented (or a recorded error), every response status
 * appears, and a request body documents every field.
 */
import { assert, assertEquals, assertExists } from 'jsr:@std/assert@^1.0.0'
import type { OasOperation } from '@skmtc/core'
import { kitchenSinkBasePath, kitchenSinkDocument, runKitchenSink } from './helpers/kitchenSink.ts'
import { toParsedDocument } from './helpers/toParsedDocument.ts'
import { toDocsExportPath } from '../src/paths.ts'

const parsed = toParsedDocument(kitchenSinkDocument)

if (parsed.type !== 'oas') {
  throw new Error('the kitchen-sink fixture must parse as an OAS document')
}

const operations = parsed.value.operations
const { artifacts, manifest } = runKitchenSink()

/** The artifact key for an operation's document — `@/docs/...` resolved to the base path. */
const docKey = (operation: OasOperation): string =>
  toDocsExportPath(operation).replace('@/', `${kitchenSinkBasePath}/`)

Deno.test('coverage - one document per operation, none silently dropped', () => {
  const opDocs = Object.keys(artifacts).filter(
    path => path.endsWith('.md') && !path.endsWith('/index.md')
  )
  const errors = manifest.parseIssues.filter(issue => issue.level === 'error')

  // The manifest accounts for everything: on a clean spec, no errors and an
  // operation document for each operation.
  assertEquals(errors, [])
  assertEquals(opDocs.length, operations.length)
})

Deno.test('coverage - every operation documents every response status', () => {
  for (const operation of operations) {
    const doc = artifacts[docKey(operation)]
    assertExists(doc, `no document for ${operation.method.toUpperCase()} ${operation.path}`)

    for (const code of Object.keys(operation.responses)) {
      assert(
        doc.includes(`### \`${code}\``),
        `${operation.method.toUpperCase()} ${operation.path} is missing response ${code}`
      )
    }
  }
})

Deno.test('coverage - a request body documents every field', () => {
  const createPet = operations.find(
    operation => operation.path === '/pets' && operation.method === 'post'
  )
  assertExists(createPet)

  const doc = artifacts[docKey(createPet)]
  assertExists(doc)

  // NewPet's fields all appear (in its "Referenced types" definition).
  for (const field of ['name', 'status', 'category', 'photoUrls', 'metadata']) {
    assert(doc.includes(`**${field}**`), `create-pet document is missing field "${field}"`)
  }
})
