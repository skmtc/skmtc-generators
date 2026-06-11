import type { GenerateContextType, OasUnion } from '@skmtc/core'
import { CsAttribute, CsSnippet } from '@skmtc/lang-csharp'
import { toCsModelDisplayName } from './modelNames.ts'
import { toMemberTag } from './polymorphicMembership.ts'
import { getUnionHint } from './unionHints.ts'

type CsPolymorphicParentValueArgs = {
  context: GenerateContextType
  unionSchema: OasUnion
  destinationPath: string
}

/**
 * The (empty) body of a generated polymorphic parent — the value a
 * `CsDefinition` wraps in the bodyless
 * `public abstract partial record Animal;` shell.
 *
 * Carries the parent-side System.Text.Json attributes via the
 * `CsAttributed` protocol (D14 — OpenAPI's own direction, no
 * member-side serialization claims):
 * `[JsonPolymorphic(TypeDiscriminatorPropertyName = "<prop>")]` plus
 * one `[JsonDerivedType(typeof(<Member>), "<tag>")]` per member in
 * schema order, tags from `discriminator.mapping` else the member's
 * refName. Member type references render bare — same-namespace
 * suppression makes them correct in the single-`baseNamespace` v1.
 *
 * The serialization flavor seam: a Newtonsoft sibling generator
 * replaces the attribute construction in this file (and
 * `CsRecordValue` / `CsEnumMembers`) only.
 */
export class CsPolymorphicParentValue extends CsSnippet {
  attributes: CsAttribute[]
  /** The `CsDocumented` protocol input — rendered by `CsDefinition` as an XML-doc summary. */
  description: string | undefined

  constructor({ context, unionSchema, destinationPath }: CsPolymorphicParentValueArgs) {
    super({ context, stackTrail: unionSchema.stackTrail.clone() })

    this.description = unionSchema.description

    // A hinted (undiscriminated) union asserts its property through the
    // enrichment; tags then come from the members' single-valued enum
    // values (no `mapping` exists by definition — the decision-3 port).
    const hint = unionSchema.discriminator ? undefined : getUnionHint(context, unionSchema)
    const { propertyName = hint?.propertyName ?? '', mapping = {} } =
      unionSchema.discriminator ?? {}

    this.attributes = [
      new CsAttribute('JsonPolymorphic', [`TypeDiscriminatorPropertyName = "${propertyName}"`])
    ]

    for (const member of unionSchema.members) {
      if (!member.isRef()) {
        continue
      }

      const memberRefName = member.toRefName()
      const memberName = toCsModelDisplayName(context, memberRefName)
      const tag = toMemberTag(context, memberRefName, mapping, hint?.propertyName)

      this.attributes.push(
        new CsAttribute('JsonDerivedType', [`typeof(${memberName})`, `"${tag}"`])
      )
    }

    this.register({
      imports: {
        'System.Text.Json.Serialization': ['JsonPolymorphic', 'JsonDerivedType']
      },
      destinationPath
    })
  }

  override toString(): string {
    return ''
  }
}
