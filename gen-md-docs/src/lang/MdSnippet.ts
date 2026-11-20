import { SnippetBase, type Lang } from '@skmtc/core'
import { markdown } from './markdown.ts'

/**
 * The Markdown snippet base — where the Markdown language enters a
 * projection. The engine reads `lang` off a projection class before
 * constructing it, to make its file and its definition.
 */
export class MdSnippet extends SnippetBase {
  static lang: Lang = markdown
}
