import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { TopIndex, TagIndex, Catalog, type IndexEntry } from '../../src/snippets/DocsIndex.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

const entry = (over: Partial<IndexEntry>): IndexEntry => ({
  tags: ['pets'],
  tagFolder: 'pets',
  file: 'pets-GET.md',
  link: 'pets/pets-GET.md',
  title: 'List pets',
  method: 'GET',
  path: '/pets',
  operationId: undefined,
  ...over
})

const bareTopIndex = () =>
  new TopIndex({
    context: toGenerateContext(),
    title: 'Pet API',
    version: undefined,
    description: undefined,
    servers: [],
    externalDocs: undefined,
    securitySchemes: undefined
  })

Deno.test('TopIndex - lists tags with operation counts under an Operations heading', () => {
  const top = bareTopIndex()

  // Added out of order — the directory sorts tags alphabetically.
  top.add(entry({ tags: ['store'], tagFolder: 'store', title: 'Inventory', path: '/store' }))
  top.add(entry({ title: 'List pets' }))
  top.add(entry({ file: 'pets-POST.md', title: 'Create pet', method: 'POST' }))

  assertEquals(
    top.toString(),
    [
      '# Pet API',
      '## Operations',
      '> Reference for 3 operations, grouped by tag.',
      '- [pets](pets/index.md) — 2 operations\n- [store](store/index.md) — 1 operation'
    ].join('\n\n')
  )
})

Deno.test('TopIndex - renders version, description, servers and external docs', () => {
  const top = new TopIndex({
    context: toGenerateContext(),
    title: 'Pet API',
    version: '2.0.0',
    description: 'A store for pets.',
    servers: [{ url: 'https://api.pets.example.com', description: 'Production' }],
    externalDocs: { url: 'https://docs.pets.example.com', description: 'Full docs' },
    securitySchemes: undefined
  })

  top.add(entry({}))

  assertEquals(
    top.toString(),
    [
      '# Pet API',
      '> Version 2.0.0.',
      'A store for pets.',
      '**See also:** [Full docs](https://docs.pets.example.com)',
      '## Servers\n\n- `https://api.pets.example.com` — Production',
      '## Operations\n\n> Reference for 1 operation, grouped by tag.\n\n- [pets](pets/index.md) — 1 operation'
    ].join('\n\n')
  )
})

Deno.test('TagIndex - renders the tag description above its operations', () => {
  const tag = new TagIndex({
    context: toGenerateContext(),
    tag: 'pets',
    description: 'Everything about pets.',
    externalDocs: undefined
  })

  tag.add(entry({ title: 'List pets' }))
  tag.add(entry({ file: 'pets-POST.md', title: 'Create pet', method: 'POST' }))

  assertEquals(
    tag.toString(),
    [
      '# pets',
      'Everything about pets.',
      '- [List pets](pets-GET.md) — `GET` `/pets`\n- [Create pet](pets-POST.md) — `POST` `/pets`'
    ].join('\n\n')
  )
})

Deno.test('Catalog - renders servers and a structured record per operation', () => {
  const catalog = new Catalog({
    context: toGenerateContext(),
    title: 'Pet API',
    servers: [{ url: 'https://api.pets.example.com', description: undefined }]
  })

  catalog.add(entry({ operationId: 'listPets' }))

  assertEquals(
    catalog.toString(),
    JSON.stringify(
      {
        title: 'Pet API',
        servers: ['https://api.pets.example.com'],
        operations: [
          {
            operationId: 'listPets',
            method: 'GET',
            path: '/pets',
            tags: ['pets'],
            summary: 'List pets',
            file: 'pets/pets-GET.md'
          }
        ]
      },
      null,
      2
    )
  )
})
