import { toStringLiteral, TsSnippet } from '@skmtc/lang-typescript'
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
    return applyModifiers(toContent(this), this.modifiers)
  }

}

const toContent = ({ enums, format }: Pick<ValibotString, 'enums' | 'format'>): string => {
  if (!Array.isArray(enums)) {
    return format === 'date-time' ? `v.pipe(v.string(), v.isoDateTime())` : `v.string()`
  }

  // Core lists `null` only on a nullable schema, and the nullable
  // modifier adds `v.nullable(…)`, so the picklist lists the strings.
  // An empty `enum: []` accepts nothing.
  const members: Array<string | null> = enums
  const values = members.filter((value): value is string => value !== null)

  if (values.length === 0) {
    return members.includes(null) ? 'v.null()' : 'v.never()'
  }

  if (values.length === 1) {
    return `v.literal(${toStringLiteral(values[0])})`
  }

  return `v.picklist([${values.map(toStringLiteral).join(', ')}])`
}
