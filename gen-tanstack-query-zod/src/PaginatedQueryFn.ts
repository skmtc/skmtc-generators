import type { ListObject, OperationInsertableArgs } from '@skmtc/core'
import {
  FunctionParameter,
  capitalize,
  Identifier,
  List,
  toPathTemplate,
  decapitalize,
  OasVoid
} from '@skmtc/core'
import { toTsValue } from '@skmtc/gen-typescript'
import { TanstackQueryBase } from './base.ts'
import { ZodInsertable } from '@skmtc/gen-zod'

export class PaginatedQueryFn extends TanstackQueryBase {
  parameter: FunctionParameter
  zodResponseName: string
  queryParamArgs: ListObject<string>

  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.queryParamArgs = List.toObject(operation.toParams(['query']).map(({ name }) => name))

    const zodResponse = this.insertNormalizedModel(ZodInsertable, {
      schema: operation.toSuccessResponse()?.resolve().toSchema() ?? OasVoid.empty(),
      fallbackName: `${decapitalize(settings.identifier.name)}Response`
    })

    this.zodResponseName = zodResponse.identifier.name

    const typeDefinition = this.createAndRegisterDefinition({
      schema: operation.toParametersObject(),
      identifier: Identifier.createType(`${capitalize(settings.identifier.name)}Args`),
      schemaToValueFn: toTsValue
    })

    this.parameter = new FunctionParameter({
      typeDefinition,
      destructure: true,
      required: true,
      skipEmpty: true
    })
  }

  override toString(): string {
    const { path, method } = this.operation

    return `async (${this.parameter}) => {
      const res = await fetch(\`${toPathTemplate(path)}\`, {
        method: '${method.toUpperCase()}',
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }

      const data = await res.json()

      const parsed = ${this.zodResponseName}.parse(data)

      return parsed
    }`
  }
}
