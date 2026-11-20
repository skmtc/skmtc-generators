import { assert, assertStringIncludes } from '@std/assert'
import type { OpenAPIV3 } from 'openapi-types'
import { TopIndex } from '../../src/snippets/DocsIndex.ts'
import { docsSystem } from '../helpers/docsSystem.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toOperationDocument } from '../helpers/toOperationDocument.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

/** The document of one `GET /things`, and the components it may name. */
type RenderArgs = {
  operation: OpenAPIV3.OperationObject
  /** The parameters of the path item, which apply to the operation too. */
  shared?: OpenAPIV3.PathItemObject['parameters']
  components?: OpenAPIV3.ComponentsObject
}

/**
 * The Markdown of `GET /things`, parsed as the docs parse it: every kind of
 * `$ref` may name nothing, so the parser keeps the operation.
 */
const render = ({ operation, shared, components }: RenderArgs): string => {
  const parsed = toParsedDocument(
    {
      openapi: '3.0.3',
      info: { title: 'Dangling', version: '1' },
      paths: { '/things': { parameters: shared, get: operation } },
      components
    },
    { system: docsSystem }
  )
  assert(parsed.type === 'oas')
  const [subject] = parsed.value.operations
  assert(subject !== undefined, 'the parser kept the operation')

  return toOperationDocument({ parsed, operation: subject })
}

const ok = { description: 'ok' }
const json = (schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject) => ({
  'application/json': { schema }
})
const limit: OpenAPIV3.ParameterObject = { name: 'limit', in: 'query', schema: { type: 'integer' } }

Deno.test('dangling refs - a response schema $ref that names nothing renders its name, marked', () => {
  const markdown = render({
    operation: { responses: { '200': { ...ok, content: json({ $ref: '#/components/schemas/X' }) } } }
  })

  assertStringIncludes(markdown, '### `200` — ok')
  assertStringIncludes(markdown, '`X` (unresolved $ref)')
})

Deno.test('dangling refs - an array of one renders its element type, marked', () => {
  const markdown = render({
    operation: {
      responses: {
        '200': { ...ok, content: json({ type: 'array', items: { $ref: '#/components/schemas/X' } }) }
      }
    }
  })

  assertStringIncludes(markdown, '`X[]` (unresolved $ref)')
})

Deno.test('dangling refs - a parameter $ref that names nothing is listed by its $ref, and the defined parameters stay', () => {
  const markdown = render({
    operation: { parameters: [limit, { $ref: '#/components/parameters/X' }], responses: { '200': ok } }
  })

  assertStringIncludes(markdown, '## Query parameters\n\n**limit** `integer`')
  assertStringIncludes(markdown, '## Parameters\n\n- `#/components/parameters/X` (unresolved $ref)')
})

Deno.test('dangling refs - a parameter whose schema $ref names nothing renders its name and type, marked', () => {
  const markdown = render({
    operation: {
      parameters: [{ name: 'filter', in: 'query', schema: { $ref: '#/components/schemas/X' } }],
      responses: { '200': ok }
    }
  })

  assertStringIncludes(markdown, '**filter** `X` (unresolved $ref)')
})

Deno.test('dangling refs - a request body $ref that names nothing keeps the heading, over the $ref', () => {
  const markdown = render({
    operation: { requestBody: { $ref: '#/components/requestBodies/X' }, responses: { '200': ok } }
  })

  assertStringIncludes(markdown, '## Request body\n\n- `#/components/requestBodies/X` (unresolved $ref)')
})

Deno.test('dangling refs - a response $ref that names nothing keeps its code, marked, next to the others', () => {
  const success = render({ operation: { responses: { '200': { $ref: '#/components/responses/X' } } } })
  assertStringIncludes(success, '### `200` (unresolved $ref)')

  const error = render({
    operation: { responses: { '200': ok, '404': { $ref: '#/components/responses/X' } } }
  })
  assertStringIncludes(error, '### `200` — ok')
  assertStringIncludes(error, '### `404` (unresolved $ref)')
})

Deno.test('dangling refs - a header or link $ref that names nothing renders its name, marked', () => {
  const markdown = render({
    operation: {
      responses: {
        '200': {
          ...ok,
          headers: { 'X-Rate': { $ref: '#/components/headers/X' } },
          links: { next: { $ref: '#/components/links/X' } }
        }
      }
    }
  })

  assertStringIncludes(markdown, '**Headers**\n\n- **X-Rate** (unresolved $ref)')
  assertStringIncludes(markdown, '**Links**\n\n- **next** (unresolved $ref)')
})

Deno.test('dangling refs - a security scheme $ref that names nothing renders its name, marked', () => {
  const markdown = render({
    operation: { security: [{ key: ['read'] }], responses: { '200': ok } },
    components: { securitySchemes: { key: { $ref: '#/components/securitySchemes/X' } } }
  })

  assertStringIncludes(markdown, '- `key` (unresolved $ref) — scopes: `read`')
})

Deno.test("parameters - the path item's parameters are documented with the operation's own", () => {
  const markdown = render({
    shared: [{ name: 'version', in: 'query', schema: { type: 'string' } }],
    operation: { parameters: [limit], responses: { '200': ok } }
  })

  assertStringIncludes(markdown, '**version** `string`')
  assertStringIncludes(markdown, '**limit** `integer`')
})

Deno.test("dangling refs - the index's Authentication list marks a security scheme $ref that names nothing", () => {
  const parsed = toParsedDocument(
    {
      openapi: '3.0.3',
      info: { title: 'Dangling', version: '1' },
      paths: {},
      components: {
        securitySchemes: {
          key: { $ref: '#/components/securitySchemes/X' },
          bearer: { type: 'http', scheme: 'bearer' }
        }
      }
    },
    { system: docsSystem }
  )
  assert(parsed.type === 'oas')

  const index = new TopIndex({
    context: toGenerateContext({ oasDocument: parsed }),
    title: 'Dangling',
    version: undefined,
    description: undefined,
    servers: [],
    externalDocs: undefined,
    securitySchemes: parsed.value.components?.securitySchemes
  })

  assertStringIncludes(`${index}`, '## Authentication\n\n- `key` (unresolved $ref)\n- `bearer` — HTTP bearer')
})
