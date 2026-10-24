import { Loop, Wrap } from '@/src/Maybe.ts'

type ZodNumericLiteralsArgs = {
  enums: number[] | (number | null)[]
}

/**
 * A numeric enum: `z.literal(7)` for one value, otherwise
 * `z.union([z.literal(1), z.literal(2)])`.
 */
export class ZodNumericLiterals {
  content: Wrap

  constructor({ enums }: ZodNumericLiteralsArgs) {
    const literals = new Loop(enums.map(value => `z.literal(${value})`))

    this.content =
      enums.length === 1 ? new Wrap([literals]) : new Wrap(['z.union([', literals, '])'])
  }

  toString(): string {
    return `${this.content}`
  }
}
