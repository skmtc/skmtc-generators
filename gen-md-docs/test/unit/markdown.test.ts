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
