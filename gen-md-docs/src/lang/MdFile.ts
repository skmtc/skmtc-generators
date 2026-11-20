import { CodeFileBase, matchDefinitions } from '@skmtc/core'
import type { DefinitionBase, FindDefinitionsQuery, IdentifierBase, ImportBase, ReExportBase } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { MdIdentifier } from './MdIdentifier.ts'

type MdFileArgs = {
  path: string
}

/**
 * One operation's Markdown document: the document itself, then the sections
 * it links to — its referenced types — under `## Referenced types`, in
 * alphabetical order of their names (ignoring case, then by case), so the
 * order does not depend on which type was reached first. Each section is
 * keyed by its identifier's name, and the first one written wins.
 *
 * A file holds one document. Each operation's document has a path of its own
 * (`toDocumentPath`), so a second document here is an error, not a document
 * to drop.
 *
 * Markdown has no imports: a reference inside a document is an anchor link,
 * and every type a document links to is written into that document.
 */
export class MdFile extends CodeFileBase {
  /** The operation's document. */
  document: DefinitionBase | undefined
  /** The sections, kept in alphabetical order. */
  sections: List<DefinitionBase[], '\n\n', 'none'>
  /** The sections by name, for the engine's lookups. */
  sectionsByName: Map<string, DefinitionBase>

  constructor({ path }: MdFileArgs) {
    super({ path })

    this.document = undefined
    this.sections = new List<DefinitionBase[], '\n\n', 'none'>([], { separator: '\n\n' })
    this.sectionsByName = new Map()
  }

  override addDefinition(definition: DefinitionBase): void {
    const { name } = definition.identifier

    if (isDocument(definition.identifier)) {
      if (this.document !== undefined && this.document.identifier.name !== name) {
        throw new Error(
          `${this.path}: '${name}' has the same document path as '${this.document.identifier.name}'. A Markdown file holds one document.`
        )
      }

      this.document ??= definition

      return
    }

    if (this.sectionsByName.has(name)) {
      return
    }

    this.sectionsByName.set(name, definition)
    this.sections.values.splice(toSectionIndex(this.sections.values, name), 0, definition)
  }

  // deno-lint-ignore skmtc/method-discipline -- MdFile is a file (a CodeFileBase the engine writes into), not a producer; the rule reads `…Base` as a projection base.
  override addImports(imports: ImportBase[]): void {
    throw new Error(
      `${this.path}: Markdown has no imports (${imports.length} given). A type a document links to is written into that document.`
    )
  }

  // deno-lint-ignore skmtc/method-discipline -- MdFile is a file (a CodeFileBase the engine writes into), not a producer; the rule reads `…Base` as a projection base.
  override addReExports(_reExports: ReExportBase[]): void {
    throw new Error(`${this.path}: Markdown has no re-exports.`)
  }

  // deno-lint-ignore skmtc/method-discipline -- MdFile is a file (a CodeFileBase the engine writes into), not a producer; the rule reads `…Base` as a projection base.
  override findDefinitions(query?: FindDefinitionsQuery): DefinitionBase[] | undefined {
    const candidates =
      query?.name !== undefined
        ? [this.document, this.sectionsByName.get(query.name)]
        : [this.document, ...this.sections.values]
    const all = candidates.filter(definition => definition !== undefined)

    return matchDefinitions(all, query, identifier =>
      identifier instanceof MdIdentifier ? identifier.type : undefined
    )
  }

  override toString(): string {
    if (this.document === undefined) {
      // deno-lint-ignore skmtc/tostring-purity -- MdFile is a file (a CodeFileBase the engine writes into), not a producer; the rule reads `…Base` as a projection base. A file without its document is an engine fault, reported here.
      throw new Error(`${this.path}: a Markdown file needs its document`)
    }

    return this.sections.values.length > 0
      ? `${this.document}\n\n## Referenced types\n\n${this.sections}`
      : `${this.document}`
  }
}

const isDocument = (identifier: IdentifierBase): boolean =>
  identifier instanceof MdIdentifier && identifier.type === 'document'

/** Where a section named `name` goes in `sections`, which are in {@link compareNames} order: a binary search. */
const toSectionIndex = (sections: DefinitionBase[], name: string): number => {
  let low = 0
  let high = sections.length

  while (low < high) {
    const middle = (low + high) >>> 1

    if (compareNames(sections[middle].identifier.name, name) < 0) {
      low = middle + 1
    } else {
      high = middle
    }
  }

  return low
}

/** Alphabetical order, ignoring case first, so `apiKey` comes before `User`; then by case, so the order is total. */
const compareNames = (a: string, b: string): number => {
  const folded = compareCodeUnits(a.toLowerCase(), b.toLowerCase())

  return folded !== 0 ? folded : compareCodeUnits(a, b)
}

const compareCodeUnits = (a: string, b: string): number => {
  if (a < b) {
    return -1
  }

  return a > b ? 1 : 0
}
