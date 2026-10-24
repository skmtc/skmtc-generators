import type { Modifiers } from '@skmtc/core'
import { Loop, Maybe } from '@/src/Maybe.ts'

/**
 * The modifier calls appended to a Zod expression: `.nullable()` when the
 * value is nullable, then `.optional()` when it is not required. Renders `''`
 * for a required, non-nullable value.
 */
export class ZodModifiers {
  calls: Loop

  constructor({ nullable, required }: Modifiers) {
    this.calls = new Loop(
      [
        Maybe.when(nullable === true, () => '.nullable()'),
        Maybe.when(required !== true, () => '.optional()')
      ],
      { separator: '' }
    )
  }

  toString(): string {
    return `${this.calls}`
  }
}
