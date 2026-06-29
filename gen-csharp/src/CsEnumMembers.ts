import { CsAttribute, CsSnippet, toCsEnumMemberNames, type CsEnumMember } from '@skmtc/lang-csharp'
import type { GenerateContextType, StackTrail } from '@skmtc/core'

type CsEnumMembersArgs = {
  context: GenerateContextType
  /** The wire values (nulls already filtered — nullability is the type's `?`). */
  values: string[]
  /** The enclosing enum's type name — pre-seeded into the dedup set (CS0542: a member may not share its enclosing type's name). */
  typeName: string
  destinationPath: string
  /** The schema `description`, surfaced via the `CsDocumented` protocol. */
  description?: string
  stackTrail?: StackTrail
}

/**
 * The body of a generated `enum` — one PascalCase member per wire value,
 * `[JsonStringEnumMemberName]` where the member name differs from the
 * wire value (D11; .NET 9 — scratch-proof 5), blank-line-joined, no
 * trailing comma. Member names come from the lang's
 * `toCsEnumMemberNames`: full-produced-set dedup (the note-30 `A_B_2`
 * lesson) with the type name pre-seeded against CS0542.
 *
 * Carries the class-level `[JsonConverter(typeof(JsonStringEnumConverter))]`
 * via the `CsAttributed` protocol; `CsDefinition` renders it above the
 * shell. An unknown wire value THROWS on deserialize — for server
 * request DTOs that is the contract working (a 400), the A4-documented
 * divergence from client-SDK open enums.
 *
 * The serialization flavor seam: a Newtonsoft sibling generator replaces
 * the attribute construction in this file (and `CsRecordValue`) only.
 */
export class CsEnumMembers extends CsSnippet {
  attributes = [new CsAttribute('JsonConverter', ['typeof(JsonStringEnumConverter)'])]
  /** The `CsDocumented` protocol input — rendered by `CsDefinition` as an XML-doc summary. */
  description: string | undefined
  members: CsEnumMember[]

  constructor({
    context,
    values,
    typeName,
    destinationPath,
    description,
    stackTrail
  }: CsEnumMembersArgs) {
    super({ context, stackTrail })

    this.description = description
    this.members = toCsEnumMemberNames(values, { reserved: [typeName] })

    this.register({
      imports: {
        'System.Text.Json.Serialization': ['JsonConverter', 'JsonStringEnumConverter']
      },
      destinationPath
    })

    if (this.members.some(member => member.name !== member.wireValue)) {
      this.register({
        imports: { 'System.Text.Json.Serialization': ['JsonStringEnumMemberName'] },
        destinationPath
      })
    }
  }

  override toString(): string {
    return this.members
      .map(({ name, wireValue }, index) => {
        const attribute =
          name === wireValue ? '' : `    [JsonStringEnumMemberName("${wireValue}")]\n`
        const comma = index < this.members.length - 1 ? ',' : ''

        return `${attribute}    ${name}${comma}`
      })
      .join('\n\n')
  }
}
