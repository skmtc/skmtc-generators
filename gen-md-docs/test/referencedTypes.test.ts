/**
 * Whole runs through the real pipeline, for what only shows across a run:
 * how referenced types are named and linked in each document, which
 * documents they are defined in, and where each document is written.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts, type SystemSettings } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { mdDocsEntry } from '../src/mod.ts'
import { docsSystem } from './helpers/docsSystem.ts'

const ok = { description: 'ok' }
const json = (schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject) => ({
  'application/json': { schema }
})
const ref = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/schemas/${name}` })

/** One run over `document`, with the documents named as the skmtc-md-docs stack names them. */
const run = (document: Omit<OpenAPIV3.Document, 'openapi' | 'info'>, system?: SystemSettings) =>
  toArtifacts({
    traceId: 'gen-md-docs-referenced-types',
    spanId: 'run',
    startAt: Date.now(),
    document: { type: 'oas', value: { openapi: '3.0.3', info: { title: 'Types', version: '1' }, ...document } },
    settings: { basePath: './src', generatedSuffix: '', system },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-md-docs': mdDocsEntry
    })
  })

/**
 * A run with the `system` settings the skmtc-md-docs stack runs with: every
 * kind of `$ref` may name nothing. Core names a loop of `$ref`s a dangling
 * ref, so without them the parser removes the loop and what uses it.
 */
const runDocs = (document: Omit<OpenAPIV3.Document, 'openapi' | 'info'>) => run(document, docsSystem)

/** The `### …` headings of a document's referenced types, in order. */
const toTypeHeadings = (markdown: string): string[] =>
  [...markdown.split('## Referenced types')[1]?.matchAll(/^### .+$/gm) ?? []].map(match => match[0])

Deno.test('referenced types - two refNames shown by the same name are both defined, each at its own anchor', () => {
  // `camelCase` shows `pet` and `Pet` both as `Pet`. Keyed by that name, the
  // second insert threw `Registered definition mismatch` and failed the run.
  const { artifacts } = run({
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': {
              ...ok,
              content: json({ type: 'object', properties: { lower: ref('pet'), upper: ref('Pet') } })
            }
          }
        }
      }
    },
    components: {
      schemas: {
        pet: { type: 'object', properties: { name: { type: 'string' } } },
        Pet: { type: 'object', properties: { id: { type: 'integer' } } }
      }
    }
  })
  const markdown = artifacts['src/docs/pets-GET.md']

  assertStringIncludes(markdown, '- **lower** [`Pet`](#type-pet)')
  assertStringIncludes(markdown, '- **upper** [`Pet`](#type-Pet)')
  assertEquals(toTypeHeadings(markdown), ['### <a id="type-Pet"></a>Pet', '### <a id="type-pet"></a>Pet'])
  assertStringIncludes(markdown, '### <a id="type-pet"></a>Pet\n\n`object`\n- **name** `string`')
  assertStringIncludes(markdown, '### <a id="type-Pet"></a>Pet\n\n`object`\n- **id** `integer`')
})

Deno.test('referenced types - a refName with no Latin letters is shown as written, at an anchor of its own', () => {
  // `camelCase` turns every non-ASCII name into '', so `用户` and `订单` collided too.
  const { artifacts } = run({
    paths: {
      '/orders': {
        get: {
          responses: {
            '200': {
              ...ok,
              content: json({ type: 'object', properties: { user: ref('用户'), order: ref('订单') } })
            }
          }
        }
      }
    },
    components: {
      schemas: {
        用户: { type: 'object', properties: { name: { type: 'string' } } },
        订单: { type: 'object', properties: { total: { type: 'number' } } }
      }
    }
  })
  const markdown = artifacts['src/docs/orders-GET.md']
  const user = `type-${encodeURIComponent('用户')}`
  const order = `type-${encodeURIComponent('订单')}`

  assertStringIncludes(markdown, `- **user** [\`用户\`](#${user})`)
  assertStringIncludes(markdown, `- **order** [\`订单\`](#${order})`)
  assertStringIncludes(markdown, `### <a id="${user}"></a>用户\n\n\`object\`\n- **name** \`string\``)
  assertStringIncludes(markdown, `### <a id="${order}"></a>订单\n\n\`object\`\n- **total** \`number\``)
})

Deno.test("referenced types - a type named like one of the page's sections links to the type, not the section", () => {
  // GitHub gives `#headers` to the page's `**Headers**`-style headings first.
  const { artifacts } = run({
    paths: {
      '/things': { get: { responses: { '200': { ...ok, content: json(ref('Headers')) } } } }
    },
    components: { schemas: { Headers: { type: 'object', properties: { etag: { type: 'string' } } } } }
  })
  const markdown = artifacts['src/docs/things-GET.md']

  assertStringIncludes(markdown, '[`Headers`](#type-Headers)')
  assertStringIncludes(markdown, '### <a id="type-Headers"></a>Headers')
})

Deno.test('referenced types - every document that links to a type defines it and the types it links to', () => {
  // A type's rows are built once per run. Each document still defines the
  // type, and `Category` through it, so no document links to a type it lacks.
  const pet = json(ref('Pet'))
  const { artifacts } = run({
    paths: {
      '/pets': { get: { responses: { '200': { ...ok, content: pet } } } },
      '/pets/{id}': {
        get: {
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { ...ok, content: pet } }
        }
      }
    },
    components: {
      schemas: {
        Pet: { type: 'object', properties: { category: ref('Category') } },
        Category: { type: 'object', properties: { name: { type: 'string' } } }
      }
    }
  })
  const expected = [
    '### <a id="type-Category"></a>Category\n\n`object`\n- **name** `string`',
    '### <a id="type-Pet"></a>Pet\n\n`object`\n- **category** [`Category`](#type-Category)'
  ].join('\n\n')

  for (const path of ['src/docs/pets-GET.md', 'src/docs/pets-id-GET.md']) {
    assertEquals(artifacts[path].split('## Referenced types\n\n')[1], expected, path)
  }
})

Deno.test('document paths - operations that share a document path each get their own document, and their own types', () => {
  // `/pets` and `/pets/` both name `pets-GET.md`. The first document kept the
  // file, and the second one's types were written into it.
  const { artifacts } = run({
    paths: {
      '/pets': { get: { summary: 'Without slash', responses: { '200': { ...ok, content: json(ref('A')) } } } },
      '/pets/': { get: { summary: 'With slash', responses: { '200': { ...ok, content: json(ref('B')) } } } }
    },
    components: {
      schemas: {
        A: { type: 'object', properties: { a: { type: 'string' } } },
        B: { type: 'object', properties: { b: { type: 'string' } } }
      }
    }
  })

  assertStringIncludes(artifacts['src/docs/pets-GET.md'], 'path: "/pets"')
  assertEquals(toTypeHeadings(artifacts['src/docs/pets-GET.md']), ['### <a id="type-A"></a>A'])
  assertStringIncludes(artifacts['src/docs/pets-GET-2.md'], 'path: "/pets/"')
  assertEquals(toTypeHeadings(artifacts['src/docs/pets-GET-2.md']), ['### <a id="type-B"></a>B'])
  assertEquals(
    JSON.parse(artifacts['src/docs/index.json']).operations.map((operation: { file: string }) => operation.file),
    ['pets-GET.md', 'pets-GET-2.md']
  )
})

Deno.test("servers - an operation's servers replace its path item's, which replace the document's", () => {
  const { artifacts } = run({
    servers: [{ url: 'https://api.example.com' }],
    paths: {
      '/files': {
        servers: [{ url: 'https://files.example.com' }],
        get: { responses: { '200': ok } },
        post: { servers: [{ url: 'https://uploads.example.com' }], responses: { '200': ok } }
      },
      '/pets': { get: { responses: { '200': ok } } }
    }
  })

  assertStringIncludes(artifacts['src/docs/files-POST.md'], 'servers:\n  - "https://uploads.example.com"')
  assertStringIncludes(artifacts['src/docs/files-GET.md'], 'servers:\n  - "https://files.example.com"')
  assertStringIncludes(artifacts['src/docs/pets-GET.md'], 'servers:\n  - "https://api.example.com"')
})

Deno.test('aliases - a $ref chain that loops renders each alias linking to the next, and the run succeeds', () => {
  // `resolve()` followed `A` → `B` → `A`… until it threw `Max lookups
  // reached`, which failed the run. Each alias is a type of its own now, and
  // `B`'s link back to `A` finds `A` already in the document.
  const { artifacts, manifest } = runDocs({
    paths: { '/loop': { get: { responses: { '200': { ...ok, content: json(ref('A')) } } } } },
    components: { schemas: { A: ref('B'), B: ref('A') } }
  })
  const markdown = artifacts['src/docs/loop-GET.md']

  assertEquals(manifest.parseIssues.filter(issue => issue.type === 'RUN_FAILED'), [])
  assertStringIncludes(markdown, '### `200` — ok\n\n[`A`](#type-A)')
  assertEquals(markdown.split('## Referenced types\n\n')[1], [
    '### <a id="type-A"></a>A\n\n[`B`](#type-B)',
    '### <a id="type-B"></a>B\n\n[`A`](#type-A)'
  ].join('\n\n'))
})

Deno.test('a $ref chain that loops in a request body, response, header or link is unresolved, and the run succeeds', () => {
  // These kinds have no entry of their own to link to, so `resolve()` threw
  // `Max lookups reached` and the run wrote no document at all, `/fine` included.
  const loop = (kind: string, a: string, b: string) => ({
    [a]: { $ref: `#/components/${kind}/${b}` },
    [b]: { $ref: `#/components/${kind}/${a}` }
  })
  const document: Omit<OpenAPIV3.Document, 'openapi' | 'info'> = {
    paths: {
      '/loop': {
        post: {
          requestBody: { $ref: '#/components/requestBodies/B1' },
          responses: {
            '200': { $ref: '#/components/responses/R1' },
            '201': {
              description: 'created',
              headers: { 'X-Rate': { $ref: '#/components/headers/H1' } },
              links: { next: { $ref: '#/components/links/L1' } }
            }
          }
        }
      },
      '/fine': { get: { responses: { '200': ok } } }
    },
    components: {
      requestBodies: loop('requestBodies', 'B1', 'B2'),
      responses: loop('responses', 'R1', 'R2'),
      headers: loop('headers', 'H1', 'H2'),
      links: loop('links', 'L1', 'L2')
    }
  }
  const { artifacts, manifest } = runDocs(document)
  const markdown = artifacts['src/docs/loop-POST.md']

  assertEquals(manifest.parseIssues.filter(issue => issue.type === 'RUN_FAILED'), [])
  assertEquals(typeof artifacts['src/docs/fine-GET.md'], 'string')
  assertStringIncludes(markdown, '## Request body\n\n- `#/components/requestBodies/B1` (unresolved $ref)')
  assertStringIncludes(markdown, '### `200` (unresolved $ref)')
  assertStringIncludes(markdown, '- **X-Rate** (unresolved $ref)')
  assertStringIncludes(markdown, '- **next** (unresolved $ref)')

  // Without `danglingRefs`, the parser removes the operation that holds a loop, and the rest stays.
  const removed = run(document).artifacts

  assertEquals(removed['src/docs/loop-POST.md'], undefined)
  assertEquals(typeof removed['src/docs/fine-GET.md'], 'string')
})

Deno.test('aliases - an alias shows the link to what it names, and the facets are in its definition', () => {
  // As Cloudflare writes it: `account_id` is a `$ref` to `identifier`.
  const { artifacts } = run({
    paths: {
      '/accounts/{account_id}': {
        get: {
          parameters: [{ name: 'account_id', in: 'path', required: true, schema: ref('account_id') }],
          responses: { '200': ok }
        }
      }
    },
    components: {
      schemas: {
        account_id: ref('identifier'),
        identifier: { type: 'string', maxLength: 32, description: 'Identifier' }
      }
    }
  })
  const markdown = artifacts['src/docs/accounts-accountId-GET.md']

  assertStringIncludes(markdown, '**account_id** [`AccountId`](#type-account_id) required')
  assertEquals(markdown.split('## Referenced types\n\n')[1], [
    '### <a id="type-account_id"></a>AccountId\n\n[`Identifier`](#type-identifier) (max length: 32) — Identifier',
    '### <a id="type-identifier"></a>Identifier\n\n`string` (max length: 32) — Identifier'
  ].join('\n\n'))
})

Deno.test('aliases - the keywords next to a $ref that names a schema still apply', () => {
  const { artifacts } = run({
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': {
              ...ok,
              content: json({
                type: 'object',
                properties: { owner: { allOf: [ref('Person')], description: 'Who owns the pet', nullable: true } }
              })
            }
          }
        }
      }
    },
    components: { schemas: { Person: { type: 'object', properties: { name: { type: 'string' } } } } }
  })

  assertStringIncludes(artifacts['src/docs/pets-GET.md'], '- **owner** [`Person`](#type-Person) nullable — Who owns the pet')
})

Deno.test('referenced types - two deep targets that share a refName are both defined, each at its own anchor', () => {
  const toPointer = (status: string) => `#/components/responses/${status}/content/application~1json/schema`
  const toResponse = (property: string) => ({
    ...ok,
    content: json({ type: 'object', properties: { [property]: { type: 'string' } } })
  })
  const { artifacts } = run({
    paths: {
      '/pets': {
        get: {
          responses: {
            '400': { ...ok, content: json({ $ref: toPointer('400') }) },
            '422': { ...ok, content: json({ $ref: toPointer('422') }) }
          }
        }
      }
    },
    components: { responses: { '400': toResponse('reason'), '422': toResponse('field') } }
  })
  const markdown = Object.entries(artifacts).find(([path]) => path.endsWith('pets-GET.md'))?.[1] ?? ''

  assertEquals(
    toTypeHeadings(markdown),
    ['400', '422'].map(status => `### <a id="type-${encodeURIComponent(toPointer(status))}"></a>Schema`)
  )
})
