import { assertEquals, assertThrows } from '@std/assert'
import { DanglingRefError } from '@skmtc/core'
import { markdown } from '../../src/lang/markdown.ts'
import { MdFile } from '../../src/lang/MdFile.ts'
import { MdIdentifier } from '../../src/lang/MdIdentifier.ts'
import { MdDefinition } from '../../src/lang/MdDefinition.ts'
import { safeResolve } from '../../src/safeResolve.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'

const context = toGenerateContext()

const toDefinition = (name: string, type: 'document' | 'section', value: string) =>
  new MdDefinition({ context, identifier: new MdIdentifier({ name, type }), value })

Deno.test('MdFile - writes the document, then its sections under Referenced types, alphabetically, first write wins', () => {
  const file = new MdFile({ path: '@/docs/pets.md' })

  file.addDefinition(toDefinition('Pet', 'section', '### Pet'))
  file.addDefinition(toDefinition('Category', 'section', '### Category'))
  file.addDefinition(toDefinition('Pet', 'section', '### Pet, again'))
  file.addDefinition(toDefinition('GET /pets', 'document', '# List pets'))

  assertEquals(`${file}`, '# List pets\n\n## Referenced types\n\n### Category\n\n### Pet')
  assertEquals(file.findDefinitions({ type: 'section' })?.map(definition => definition.identifier.name), [
    'Category',
    'Pet'
  ])
})

Deno.test('MdFile - orders sections ignoring case first, so a lower-case refName sorts among the others', () => {
  const file = new MdFile({ path: '@/docs/pets.md' })

  // Code-unit order would put every upper-case name first: `Pet`, `Zone`, `apiKey`, `pet`.
  for (const name of ['Zone', 'pet', 'apiKey', 'Pet']) {
    file.addDefinition(toDefinition(name, 'section', `### ${name}`))
  }

  assertEquals(file.sections.values.map(section => section.identifier.name), ['apiKey', 'Pet', 'pet', 'Zone'])
  // The engine looks a section up by its name, which is case-sensitive.
  assertEquals(file.findDefinitions({ name: 'pet' })?.map(definition => `${definition}`), ['### pet'])
  assertEquals(file.findDefinitions({ name: 'Missing' }), undefined)
})

Deno.test('MdFile - a second document at the same path is an error, not a document dropped', () => {
  const file = new MdFile({ path: '@/docs/pets-GET.md' })

  file.addDefinition(toDefinition('GET /pets', 'document', '# List pets'))

  assertThrows(
    () => file.addDefinition(toDefinition('GET /pets/', 'document', '# List pets, again')),
    Error,
    "'GET /pets/' has the same document path as 'GET /pets'"
  )
})

Deno.test('MdFile - writes the document alone when it references no type', () => {
  const file = new MdFile({ path: '@/docs/pets.md' })

  file.addDefinition(toDefinition('GET /pets', 'document', '# List pets'))

  assertEquals(`${file}`, '# List pets')
})

Deno.test('MdFile - Markdown has no imports or re-exports, and a file without its document is a fault', () => {
  const file = new MdFile({ path: '@/docs/pets.md' })

  assertThrows(() => file.addImports([]), Error, 'Markdown has no imports')
  assertThrows(() => file.addReExports([]), Error, 'no re-exports')
  assertThrows(() => `${file}`, Error, 'needs its document')
})

Deno.test('markdown - names a document or a section, and refuses imports', () => {
  const identifier = markdown.toIdentifier({ name: 'Pet', type: 'section' })

  assertEquals(identifier instanceof MdIdentifier && identifier.type, 'section')
  assertThrows(() => markdown.toIdentifier({ name: 'Pet', type: 'variable' }), Error, "not 'variable'")
  assertThrows(() => markdown.toImport({ identifier, module: '@/docs/other.md' }), Error, 'Markdown has no imports')
})

Deno.test('safeResolve - undefined for a ref that names nothing; any other error throws', () => {
  assertEquals(safeResolve({ resolve: () => { throw new DanglingRefError('#/components/schemas/X') } }), undefined)
  assertThrows(() => safeResolve({ resolve: () => { throw new Error('boom') } }), Error, 'boom')
})
