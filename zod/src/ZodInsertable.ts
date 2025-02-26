import type { TypeSystemValue, GenerateContext, RefName, ContentSettings } from '@skmtc/core'
import { toZodValue } from './Zod.ts'
import { ZodBase } from './base.ts'

type ConstructorArgs = {
  context: GenerateContext
  destinationPath: string
  refName: RefName
  settings: ContentSettings
}

export class ZodInsertable extends ZodBase {
  value: TypeSystemValue

  constructor({ context, refName, settings, destinationPath }: ConstructorArgs) {
    super({ context, refName, settings, destinationPath })

    const schema = context.resolveSchemaRefOnce(refName)

    this.value = toZodValue({
      schema,
      required: true,
      destinationPath,
      context,
    })
  }

  toString(): string {
    return `${this.value}`
  }
}
