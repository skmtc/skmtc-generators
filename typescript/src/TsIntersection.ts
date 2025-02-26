import { ValueBase } from '@skmtc/core'
import type { GenerateContext, TypeSystemValue, GeneratorKey, OasRef, OasSchema, Modifiers } from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { applyModifiers } from './applyModifiers.ts'

type TsIntersectionArgs = {
  context: GenerateContext
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class TsIntersection extends ValueBase {
  type = 'intersection' as const
  members: TypeSystemValue[]
  allObjects: boolean
  modifiers: Modifiers
  incoming: (OasSchema | OasRef<'schema'>)[]

  constructor({ context, generatorKey, destinationPath, members, modifiers }: TsIntersectionArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    this.allObjects = members.every((member) => {
      return member.resolve().type === 'object'
    })

    this.incoming = members

    this.members = members.map((schema) => {
      return toTsValue({ destinationPath, schema, required: true, context })
    })
  }

  override toString(): string {
    const [first, ...rest] = this.members

    const firstString = first.toString()

    const content = rest.reduce<string>((acc, child) => `${acc} & ${child}`, firstString)

    return applyModifiers(content, this.modifiers)
  }
}
