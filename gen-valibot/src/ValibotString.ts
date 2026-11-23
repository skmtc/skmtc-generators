import { toStringLiteral, TsSnippet } from '@skmtc/lang-typescript'
import { match, P } from 'ts-pattern'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type ValibotStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotString extends TsSnippet {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  constructor({
    context,
    stringSchema,
    generatorKey,
    destinationPath,
    modifiers
  }: ValibotStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const { enums, format } = this

    const content = match({ enums })
      .with({ enums: P.array() }, matched => {
        // Core lists `null` only on a nullable schema, and the nullable
        // modifier adds `v.nullable(…)`, so the picklist lists the strings.
        // An empty `enum: []` accepts nothing.
        const members: Array<string | null> = matched.enums
        const values = members.filter((value): value is string => value !== null)

        return match(values.length)
          .with(0, () => (members.includes(null) ? 'v.null()' : 'v.never()'))
          .with(1, () => `v.literal(${toStringLiteral(values[0])})`)
          .otherwise(() => `v.picklist([${values.map(toStringLiteral).join(', ')}])`)
      })
      .otherwise(() => {
        let str = `v.string()`
        if (format === 'date-time') {
          str = `v.pipe(v.string(), v.isoDateTime())`
        }
        return str
      })

    return applyModifiers(content, this.modifiers)
  }
}
