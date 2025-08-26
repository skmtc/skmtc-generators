import {
  List,
  capitalize,
  toPathTemplate,
  FunctionParameter,
  decapitalize,
  OasVoid
} from '@skmtc/core'
import type { ListObject, OperationInsertableArgs } from '@skmtc/core'
import { TanstackQueryBase } from './base.ts'
import { TsInsertable } from '@skmtc/gen-typescript'
import { ZodInsertable } from '@skmtc/gen-zod'

export class QueryFn extends TanstackQueryBase {
  zodResponseName: string
  parameter: FunctionParameter
  queryParamArgs: ListObject<string>
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.queryParamArgs = List.toObject(operation.toParams(['query']).map(({ name }) => name))

    const typeDefinition = this.insertNormalizedModel(TsInsertable, {
      schema: operation.toParametersObject(),
      fallbackName: `${capitalize(settings.identifier.name)}Args`
    })

    this.parameter = new FunctionParameter({
      typeDefinition,
      destructure: true,
      required: true,
      skipEmpty: true
    })

    const zodResponse = this.insertNormalizedModel(ZodInsertable, {
      schema: operation.toSuccessResponse()?.resolve().toSchema() ?? OasVoid.empty(),
      fallbackName: `${decapitalize(settings.identifier.name)}Response`
    })

    this.zodResponseName = zodResponse.identifier.name
  }

  override toString(): string {
    const { path, method } = this.operation

    return `async () => {
      const res = await fetch(\`${toPathTemplate(path)}\`, {
        method: '${method.toUpperCase()}'
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }
    
      const data = await res.json()

      return ${this.zodResponseName}.parse(data)
    }`
  }
}
