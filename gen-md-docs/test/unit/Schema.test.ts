import { assert, assertEquals, assertExists } from '@std/assert'
import { OasArray, OasNumber, OasObject, OasString, OasUnion } from '@skmtc/core'
import { Schema } from '../../src/snippets/Schema.ts'
import { DocumentSchema } from '../../src/snippets/DocumentSchema.ts'
import { MdFile } from '../../src/lang/MdFile.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'
import { docsSystem } from '../helpers/docsSystem.ts'

/** The document the snippets are written in, suffixed as the engine names a projection's file. */
const DOC = '@/docs/test.generated.md'

Deno.test('Schema - renders a named scalar with its description', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: 'id',
    schema: new OasString({ description: 'The pet identifier' }),
    required: true
  })

  assertEquals(snippet.toString(), '**id** `string` required — The pet identifier')
})

Deno.test('Schema - renders the format modifier from the schema', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: 'createdAt',
    schema: new OasString({ format: 'date-time' }),
    required: true
  })

  assertEquals(snippet.toString(), '**createdAt** `string` date-time required')
})

Deno.test('Schema - renders enum values and omits required when optional', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: 'status',
    schema: new OasString({ enums: ['active', 'inactive'] }),
    required: false
  })

  assertEquals(snippet.toString(), '**status** `string` (`active`, `inactive`)')
})

Deno.test('Schema - drops the bold name for a root schema', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: undefined,
    schema: new OasString({}),
    required: true
  })

  assertEquals(snippet.toString(), '`string` required')
})

Deno.test('Schema - renders object properties as a nested bullet list', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: undefined,
    schema: new OasObject({
      properties: { id: new OasString({}), name: new OasString({}) },
      required: ['id']
    }),
    required: false
  })

  assertEquals(snippet.toString(), '`object`\n- **id** `string` required\n- **name** `string`')
})

Deno.test('Schema - indents a nested object one level deeper', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: undefined,
    schema: new OasObject({
      properties: {
        owner: new OasObject({ properties: { name: new OasString({}) } })
      }
    }),
    required: false
  })

  assertEquals(snippet.toString(), '`object`\n- **owner** `object`\n  - **name** `string`')
})

Deno.test('Schema - renders an array of scalars as a leaf', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: 'tags',
    schema: new OasArray({ items: new OasString({}) }),
    required: false
  })

  assertEquals(snippet.toString(), '**tags** `string[]`')
})

Deno.test('Schema - expands the item properties of an object array', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: undefined,
    schema: new OasObject({
      properties: {
        addresses: new OasArray({
          items: new OasObject({ properties: { city: new OasString({}) } })
        })
      }
    }),
    required: false
  })

  assertEquals(snippet.toString(), '`object`\n- **addresses** `object[]`\n  - **city** `string`')
})

Deno.test('Schema - renders union members as bullets', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: undefined,
    schema: new OasUnion({ members: [new OasString({}), new OasNumber({})] }),
    required: false
  })

  assertEquals(snippet.toString(), '`union`\n- `string`\n- `number`')
})

Deno.test('Schema - renders string length, pattern and default constraints', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: 'username',
    schema: new OasString({ minLength: 3, maxLength: 20, pattern: '^[a-z]+$', default: 'guest' }),
    required: true
  })

  assertEquals(
    snippet.toString(),
    '**username** `string` required (min length: 3, max length: 20, pattern: `^[a-z]+$`, default: `guest`)'
  )
})

Deno.test('Schema - renders numeric range with read-only and deprecated flags', () => {
  const snippet = new Schema({
    context: toGenerateContext(),
    name: 'age',
    schema: new OasNumber({ minimum: 0, maximum: 120, readOnly: true, deprecated: true }),
    required: false
  })

  assertEquals(snippet.toString(), '**age** `number` deprecated read-only (minimum: 0, maximum: 120)')
})

Deno.test('Schema - a $ref that names nothing renders its name, marked unresolved, with no definition', () => {
  // The docs list every ref kind in `danglingRefs`, so the parser keeps the operation.
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/x': {
        post: {
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Missing' } } }
          },
          responses: { '200': { description: 'ok' } }
        }
      }
    }
  }, { system: docsSystem })

  assert(parsed.type === 'oas')

  const bodyRef = parsed.value.operations[0].toRequestBody(({ schema }) => schema)
  assertExists(bodyRef)

  const context = toGenerateContext({ oasDocument: parsed })

  // No crash: the dangling ref renders its name, marked, with no anchor link.
  const body = new Schema({ context, name: undefined, schema: bodyRef, required: false })
  assertEquals(body.toString(), '`Missing` (unresolved $ref)')
  assertEquals(body.links, [])

  // And written in a document, it inserts nothing, so no broken definition is written.
  new DocumentSchema({ context, schema: body, documentPath: DOC })
  assertEquals(context.getFile(DOC), undefined)
})

Deno.test('Schema - renders a $ref by name, linked to its definition in the same document, defined once and cycle-safe', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/node': {
        post: {
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } }
          },
          responses: { '200': { description: 'ok' } }
        }
      }
    },
    components: {
      schemas: {
        Node: {
          type: 'object',
          properties: { id: { type: 'string' }, next: { $ref: '#/components/schemas/Node' } },
          required: ['id']
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const bodyRef = parsed.value.operations[0].toRequestBody(({ schema }) => schema)
  assertExists(bodyRef)

  const context = toGenerateContext({ oasDocument: parsed })

  // In the body, the ref is a leaf — its name, linked to its definition.
  const body = new Schema({ context, name: undefined, schema: bodyRef, required: false })
  assertEquals(body.toString(), '[`Node`](#type-Node)')
  assertEquals(body.links, ['Node'])

  // Written in a document, its type is defined once there; the recursive `next` links back (no loop).
  new DocumentSchema({ context, schema: body, documentPath: DOC })
  const file = context.getFile(DOC)
  assert(file instanceof MdFile)
  assertEquals(file.sections.values.map(section => section.identifier.name), ['Node'])
  assertEquals(
    `${file.sections}`,
    '### <a id="type-Node"></a>Node\n\n`object`\n- **id** `string` required\n- **next** [`Node`](#type-Node)'
  )
})
