import type { ContentSettings, CustomValue, OasRef, OasSchema, OasVoid } from '@skmtc/core'
import type { TypeSystemValue, GenerateContext, RefName } from '@skmtc/core'
import { toTsValue } from './Ts.ts'
import { TypescriptBase } from './base.ts'

type ConstructorArgs = {
  context: GenerateContext
  destinationPath: string
  refName: RefName
  settings: ContentSettings
}

export class TsInsertable extends TypescriptBase {
  value: TypeSystemValue
  schema: OasSchema | OasRef<'schema'> | OasVoid | CustomValue
  constructor({ context, refName, settings, destinationPath }: ConstructorArgs) {
    super({ context, refName, settings, destinationPath })

    this.schema = context.resolveSchemaRefOnce(refName)

    this.value = toTsValue({
      schema: this.schema,
      required: true,
      destinationPath: settings.exportPath,
      context,
    })
  }

  toString(): string {
    return `${this.value}`
  }
}
