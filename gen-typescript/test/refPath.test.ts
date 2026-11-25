/**
 * Refs that do not point at a component (skmtc/skmtc#387). Models are named
 * from `ref.refName` by default, so two targets that share one collide.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { runE2eFixture, toDocumentObject } from '@skmtc/test-support'
import { typescriptEntry } from '../src/mod.ts'

const text = { type: 'string' }

const toSchemasDocument = (schemas: Record<string, unknown>) =>
  toDocumentObject({ openapi: '3.1.0', info: { title: 'Refs', version: '1' }, paths: {}, components: { schemas } }, 'refs')

Deno.test('a ref into $defs generates a model named from refName', () => {
  const { artifacts } = runE2eFixture({
    id: '@skmtc/gen-typescript',
    entry: typescriptEntry,
    document: toSchemasDocument({
      Shared: { type: 'object', $defs: { schema0: { type: 'object', properties: { id: text } } } },
      Input: { type: 'object', properties: { value: { $ref: '#/components/schemas/Shared/$defs/schema0' } } }
    })
  })

  assertEquals('src/types/schema0.generated.ts' in artifacts, true)
  assertStringIncludes(artifacts['src/types/input.generated.ts'], `from '@/types/schema0.generated.ts'`)
})
