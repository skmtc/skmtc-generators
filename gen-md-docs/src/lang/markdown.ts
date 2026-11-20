import type { Lang } from '@skmtc/core'
import { MdDefinition } from './MdDefinition.ts'
import { MdFile } from './MdFile.ts'
import { MdIdentifier, isMdEntityType } from './MdIdentifier.ts'

/**
 * The Markdown language: what the engine calls to make a file, a definition
 * and an identifier for a projection built on {@link MdSnippet}.
 */
export const markdown: Lang = {
  createFile: ({ path }) => new MdFile({ path }),
  toDefinition: ({ context, identifier, value }) => new MdDefinition({ context, identifier, value }),
  toImport: ({ identifier, module }) => {
    throw new Error(
      `Markdown has no imports: '${identifier.name}' lives in '${module}'. A type a document links to is written into that document.`
    )
  },
  toIdentifier: ({ name, type, typeName, exported }) => {
    if (!isMdEntityType(type)) {
      throw new Error(`A Markdown identifier is a 'document' or a 'section', not '${type}'`)
    }

    return new MdIdentifier({ name, typeName, exported, type })
  }
}
