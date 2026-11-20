/**
 * Whole runs through the real pipeline, for what only shows across a run:
 * how referenced types are named and linked in each document, which
 * documents they are defined in, and where each document is written.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { mdDocsEntry } from '../src/mod.ts'

const ok = { description: 'ok' }
const json = (schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject) => ({
  'application/json': { schema }
})
const ref = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/schemas/${name}` })

/** One run over `document`, with the documents named as the skmtc-md-docs stack names them. */
const run = (document: Omit<OpenAPIV3.Document, 'openapi' | 'info'>) =>
  toArtifacts({
    traceId: 'gen-md-docs-referenced-types',
    spanId: 'run',
    startAt: Date.now(),
    document: { type: 'oas', value: { openapi: '3.0.3', info: { title: 'Types', version: '1' }, ...document } },
    settings: { basePath: './src', generatedSuffix: '' },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-md-docs': mdDocsEntry
    })
  })

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
