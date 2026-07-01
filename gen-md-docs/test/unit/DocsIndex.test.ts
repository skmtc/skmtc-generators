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

Deno.test('TopIndex - lists tags with operation counts, sorted alphabetically', () => {
  const top = new TopIndex({ context: toGenerateContext(), title: 'Pet API' })

  // Added out of order — the directory sorts tags alphabetically.
  top.add(entry({ tags: ['store'], tagFolder: 'store', title: 'Inventory', path: '/store' }))
  top.add(entry({ title: 'List pets' }))
  top.add(entry({ file: 'pets-POST.md', title: 'Create pet', method: 'POST' }))

  assertEquals(
    top.toString(),
    [
      '# Pet API',
      '> Reference for 3 operations, grouped by tag.',
      '- [pets](pets/index.md) — 2 operations\n- [store](store/index.md) — 1 operation'
    ].join('\n\n')
  )
})

Deno.test('TagIndex - lists a tag\'s operations, linked within the folder', () => {
  const tag = new TagIndex({ context: toGenerateContext(), tag: 'pets' })

  tag.add(entry({ title: 'List pets' }))
  tag.add(entry({ file: 'pets-POST.md', title: 'Create pet', method: 'POST' }))

  assertEquals(
    tag.toString(),
    [
      '# pets',
      '- [List pets](pets-GET.md) — `GET` `/pets`\n- [Create pet](pets-POST.md) — `POST` `/pets`'
    ].join('\n\n')
  )
})

Deno.test('Catalog - renders a structured JSON record per operation', () => {
  const catalog = new Catalog({ context: toGenerateContext(), title: 'Pet API' })

  catalog.add(entry({ operationId: 'listPets' }))

  assertEquals(
    catalog.toString(),
    JSON.stringify(
      {
        title: 'Pet API',
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
