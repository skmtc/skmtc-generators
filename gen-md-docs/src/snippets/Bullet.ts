import { SnippetBase, type GenerateContextType, type Stringable } from '@skmtc/core'

type BulletArgs<Item> = {
  context: GenerateContextType
  item: Item
}

/** One item of a bullet list: `- …`. */
export class Bullet<Item extends Stringable> extends SnippetBase {
  item: Item

  constructor({ context, item }: BulletArgs<Item>) {
    super({ context })

    this.item = item
  }

  override toString(): string {
    return `- ${this.item}`
  }
}
