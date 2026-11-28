import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, TypeSystemValue, Modifiers, OasIntersection } from '@skmtc/core'
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'

type ValibotIntersectionArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: OasIntersection
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class ValibotIntersection extends TsSnippet {
  type = 'intersection' as const
  members: TypeSystemValue[]
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: ValibotIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.members = schema.members.map(member => {
      return toValibotValue({ destinationPath, schema: member, required: true, context })
    })

    this.modifiers = modifiers

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const members = this.members.map(member => `${member}`).join(', ')

    return applyModifiers(`v.intersect([${members}])`, this.modifiers)
  }
}
