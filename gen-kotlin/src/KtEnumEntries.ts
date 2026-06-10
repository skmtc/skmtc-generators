import { KtSnippet, KtAnnotation } from '@skmtc/lang-kotlin'
import type { GenerateContextType, StackTrail } from '@skmtc/core'
import { toEnumEntryName } from './toEnumEntryName.ts'

type KtEnumEntriesArgs = {
  context: GenerateContextType
  /** The wire values (nulls already filtered — nullability is the type's `?`). */
  values: string[]
  destinationPath: string
  stackTrail?: StackTrail
}

type KtEnumEntry = {
  name: string
  wireValue: string
}

/**
 * The body of a generated `enum class` — one CONSTANT_CASE entry per wire
 * value, `@SerialName` where the entry name differs (kotlinx serializes
 * entries by name). Carries the class-level `@Serializable` via the
 * `KtAnnotated` protocol; `KtDefinition` renders it above the shell.
 */
export class KtEnumEntries extends KtSnippet {
  annotations = [new KtAnnotation('Serializable')]
  entries: KtEnumEntry[]

  constructor({ context, values, destinationPath, stackTrail }: KtEnumEntriesArgs) {
    super({ context, stackTrail })

    this.register({
      imports: { 'kotlinx.serialization': ['Serializable'] },
      destinationPath
    })

    const seen = new Map<string, number>()

    this.entries = values.map(wireValue => {
      const base = toEnumEntryName(wireValue)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)

      // Two wire values collapsing to one entry name (`a-b` and `a_b`)
      // would not compile — disambiguate deterministically.
      const name = count === 0 ? base : `${base}_${count + 1}`

      return { name, wireValue }
    })

    if (this.entries.some(entry => entry.name !== entry.wireValue)) {
      this.register({
        imports: { 'kotlinx.serialization': ['SerialName'] },
        destinationPath
      })
    }
  }

  override toString(): string {
    return this.entries
      .map(({ name, wireValue }) =>
        name === wireValue ? `    ${name}` : `    @SerialName("${wireValue}") ${name}`
      )
      .join(',\n')
  }
}
