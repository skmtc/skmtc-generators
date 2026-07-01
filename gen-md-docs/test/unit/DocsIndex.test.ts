import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { DocsIndex } from '../../src/snippets/DocsIndex.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

Deno.test('DocsIndex - groups operations by tag (alphabetical) with links and signatures', () => {
  const index = new DocsIndex({ context: toGenerateContext(), title: 'Pet API' })

  // Added out of tag order — the index sorts tags alphabetically.
  index.add({ tag: 'store', title: 'Inventory', link: 'store/store-inventory-GET.md', method: 'GET', path: '/store/inventory' })
  index.add({ tag: 'pets', title: 'List pets', link: 'pets/pets-GET.md', method: 'GET', path: '/pets' })
  index.add({ tag: 'pets', title: 'Create pet', link: 'pets/pets-POST.md', method: 'POST', path: '/pets' })

  assertEquals(
    index.toString(),
    [
      '# Pet API',
      '> Reference for 3 operations, each linking to a self-contained document.',
      '## pets\n\n- [List pets](pets/pets-GET.md) — `GET` `/pets`\n- [Create pet](pets/pets-POST.md) — `POST` `/pets`',
      '## store\n\n- [Inventory](store/store-inventory-GET.md) — `GET` `/store/inventory`'
    ].join('\n\n')
  )
})
