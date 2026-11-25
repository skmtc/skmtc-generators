import { SnippetBase, toModelRef, type GenerateContextType, type RefParts } from '@skmtc/core'
import { ComponentName } from './ComponentName.ts'
import { ObjectPage } from './ObjectPage.ts'

type PageLinkArgs = {
  context: GenerateContextType
  ref: RefParts
  /** The document the link is written in. */
  documentPath: string
}

/**
 * Where an expandable object is defined: a link to its {@link ObjectPage},
 * relative to the document, as in ``See [`Customer`](../_types/customer.md).``
 * Linking inserts the page, so the page exists for every link to it.
 */
export class PageLink extends SnippetBase {
  component: ComponentName
  /** The page, relative to the document. */
  href: string

  constructor({ context, ref, documentPath }: PageLinkArgs) {
    super({ context })

    // No `destinationPath`: Markdown has no imports to stitch into the document.
    const page = toModelRef({ context, ref, projection: ObjectPage })

    // Both are `@/` workspace paths, with forward slashes on every host: up
    // from the document's folder to the folder they share, then down to the page.
    const from = documentPath.split('/').slice(0, -1)
    const to = page.settings.exportPath.split('/')
    const differs = from.findIndex((segment, index) => segment !== to[index])
    const shared = differs === -1 ? from.length : differs

    this.component = new ComponentName({ context, ref })
    this.href = encodeURI([...from.slice(shared).map(() => '..'), ...to.slice(shared)].join('/')).replace(
      /[()]/g,
      char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
    )
  }

  override toString(): string {
    return `See [\`${this.component}\`](${this.href}).`
  }
}
