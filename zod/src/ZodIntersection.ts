import { ValueBase } from '@skmtc/core'
import type { GenerateContext, GeneratorKey, OasRef, OasSchema, TypeSystemValue, Modifiers } from '@skmtc/core'
import { toZodValue } from './Zod.ts'
import { applyModifiers } from './applyModifiers.ts'

type ZodIntersectionArgs = {
  context: GenerateContext
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class ZodIntersection extends ValueBase {
  type = 'intersection' as const
  members: TypeSystemValue[]
  allObjects: boolean
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, members, modifiers }: ZodIntersectionArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    this.allObjects = members.every((member) => {
      return member.resolve().type === 'object'
    })

    this.members = members.map((schema) => toZodValue({ destinationPath, schema, required: true, context }))
  }

  override toString(): string {
    const [first, ...rest] = this.members

    const firstString = first.toString()

    const content = rest.reduce<string>((acc, child) => {
      return `${acc}.${this.allObjects ? 'merge' : 'and'}(${child})`
    }, firstString)

    return applyModifiers(content, this.modifiers)
  }
}
