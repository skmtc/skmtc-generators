import { SnippetBase, type GenerateContextType, type ModelProjectionArgs, type RefName } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { ObjectPageBase } from '../base.ts'
import type { EnrichmentSchema } from '../enrichments.ts'
import { isExpandable } from '../expandable.ts'
import { ComponentName, TypeTitle } from './ComponentName.ts'
import { YamlField, YamlString } from './Frontmatter.ts'
import { Heading } from './Heading.ts'
import { TypeContent } from './TypeDefinition.ts'

/**
 * An expandable object's page (see `isExpandable`): frontmatter, then
 * `# Customer` (with the anchor the page's own links to it land on), then the
 * object's {@link TypeContent}, and the types it links to under "Referenced
 * types". Another expandable object it links to is a link to that object's
 * page, so a page holds the object and the types only it reaches.
 */
export class ObjectPage extends ObjectPageBase {
  blocks: List<(ObjectFrontmatter | Heading | TypeContent)[], '\n\n', 'none'>

  constructor(args: ModelProjectionArgs<EnrichmentSchema>) {
    super(args)

    const { context, refName, settings } = args

    this.blocks = new List<(ObjectFrontmatter | Heading | TypeContent)[], '\n\n', 'none'>(
      [
        new ObjectFrontmatter({ context, refName }),
        new Heading({ context, level: 1, text: new TypeTitle({ context, refName }) }),
        new TypeContent({ context, refName, documentPath: settings.exportPath })
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type ObjectFrontmatterArgs = {
  context: GenerateContextType
  refName: RefName
}

/**
 * An object page's frontmatter: `type: schema`, the refName and the name the
 * object is shown by, which a retrieval layer reads as the page's title.
 */
class ObjectFrontmatter extends SnippetBase {
  fields: List<YamlField[], '\n', 'none'>

  constructor({ context, refName }: ObjectFrontmatterArgs) {
    super({ context })

    this.fields = new List<YamlField[], '\n', 'none'>(
      [
        new YamlField({ context, key: 'type', value: 'schema' }),
        new YamlField({ context, key: 'name', value: new YamlString({ context, value: refName }) }),
        new YamlField({
          context,
          key: 'title',
          value: new YamlString({ context, value: new ComponentName({ context, refName }).name })
        })
      ],
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `---\n${this.fields}\n---`
  }
}

type IsPageOfArgs = {
  context: GenerateContextType
  refName: RefName
  documentPath: string
}

/**
 * Whether `documentPath` is the page of the expandable object `refName`. It
 * asks the engine for the page's path without inserting the page.
 */
export const isPageOf = ({ context, refName, documentPath }: IsPageOfArgs): boolean =>
  isExpandable({ context, refName }) &&
  context.toModelContentSettings({ refName, projection: ObjectPage, variant: 'main', options: undefined }).exportPath ===
    documentPath
