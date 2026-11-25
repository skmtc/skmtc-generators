import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, Modifiers, OasIntersection, RefParts, TypeSystemValue } from '@skmtc/core'
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'
import { assertNoMemberLoop } from './memberLoop.ts'

type ValibotIntersectionArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: OasIntersection
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefParts
}

/**
 * `v.intersect([animal, v.object({name: v.optional(v.string())})])`
 *
 * It has no `variantKeys`, as valibot does not take an intersection as an
 * option of `v.variant` (see `isVariantOption`).
 */
export class ValibotIntersection extends TsSnippet {
  type = 'intersection' as const
  members: TypeSystemValue[]
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, rootRef, schema }: ValibotIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    assertNoMemberLoop(schema)

    this.members = schema.members.map(member =>
      toValibotValue({ destinationPath, schema: member, required: true, context, rootRef })
    )
    this.modifiers = modifiers

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const members = this.members.map(member => `${member}`).join(', ')

    return applyModifiers(`v.intersect([${members}])`, this.modifiers)
  }
}
