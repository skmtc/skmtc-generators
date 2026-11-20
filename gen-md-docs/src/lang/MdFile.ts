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
 * alphabetical order, so the order does not depend on which type was reached
 * first. Each definition is keyed by its identifier's name, and the first one
 * written wins.
 *
 * Markdown has no imports: a reference inside a document is an anchor link,
 * and every type a document links to is written into that document.
 */
export class MdFile extends CodeFileBase {
  /** The operation's document. */
  document: DefinitionBase | undefined
  /** The sections, kept in alphabetical order. */
  sections: List<DefinitionBase[], '\n\n', 'none'>

  constructor({ path }: MdFileArgs) {
    super({ path })

    this.document = undefined
    this.sections = new List<DefinitionBase[], '\n\n', 'none'>([], { separator: '\n\n' })
  }

  override addDefinition(definition: DefinitionBase): void {
    if (isDocument(definition.identifier)) {
      this.document ??= definition

      return
    }

    const { name } = definition.identifier
    const index = this.sections.values.findIndex(section => section.identifier.name >= name)

    if (index === -1) {
      this.sections.values.push(definition)
    } else if (this.sections.values[index].identifier.name !== name) {
      this.sections.values.splice(index, 0, definition)
    }
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
    const all = this.document !== undefined ? [this.document, ...this.sections.values] : this.sections.values

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
