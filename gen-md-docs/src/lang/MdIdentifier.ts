import { IdentifierBase, type IdentifierBaseArgs } from '@skmtc/core'

/**
 * What a Markdown definition is in its file: the operation's `document`, or a
 * `section` of it, such as a referenced type.
 */
export type MdEntityType = 'document' | 'section'

/** Constructor arguments for {@link MdIdentifier}: the neutral fields plus the {@link MdEntityType}. */
export type MdIdentifierArgs = IdentifierBaseArgs & {
  type: MdEntityType
}

/** Markdown's {@link IdentifierBase}: the neutral name, plus whether it names the document or a section. */
export class MdIdentifier extends IdentifierBase {
  type: MdEntityType

  constructor({ name, typeName, exported, type }: MdIdentifierArgs) {
    super({ name, typeName, exported })

    this.type = type
  }
}

/** Narrows the engine's opaque identifier `type` to an {@link MdEntityType}. */
export const isMdEntityType = (type: string): type is MdEntityType =>
  type === 'document' || type === 'section'
