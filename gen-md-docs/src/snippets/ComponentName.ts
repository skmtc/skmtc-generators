import { camelCase, SnippetBase, type GenerateContextType } from '@skmtc/core'

type ComponentNameArgs = {
  context: GenerateContextType
  /** The component schema's name, as its `$ref` gives it. */
  refName: string
}

/**
 * The name a component schema is shown by, and the anchor of its definition in
 * a document: `simple-user` shows as `SimpleUser`, defined at
 * `#type-simple-user`.
 *
 * The name is the refName in PascalCase, as the docs viewer shows it, or the
 * refName as written when PascalCase leaves nothing (a name with no Latin
 * letters or digits, such as `用户`). The anchor comes from the refName
 * itself, so two refNames that show alike (`pet` and `Pet`) still link to
 * their own definitions, and the `type-` prefix keeps it apart from the
 * anchors of the page's own headings (`## Headers` is `#headers`). It is
 * percent-encoded, so it is the same in an `id` and in a link.
 */
export class ComponentName extends SnippetBase {
  name: string
  anchor: string

  constructor({ context, refName }: ComponentNameArgs) {
    super({ context })

    this.name = camelCase(refName, { upperFirst: true }) || refName
    this.anchor = `type-${encodeURIComponent(refName).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`
  }

  override toString(): string {
    return this.name
  }
}

type TypeTitleArgs = {
  context: GenerateContextType
  refName: string
}

/**
 * The heading text of a type's definition: the anchor its links land on, then
 * its name, as in `<a id="type-simple-user"></a>SimpleUser`.
 */
export class TypeTitle extends SnippetBase {
  component: ComponentName

  constructor({ context, refName }: TypeTitleArgs) {
    super({ context })

    this.component = new ComponentName({ context, refName })
  }

  override toString(): string {
    return `<a id="${this.component.anchor}"></a>${this.component}`
  }
}
