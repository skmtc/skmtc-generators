import type { ListObject, OperationInsertableArgs, RefName } from '@skmtc/core'
import { FunctionParameter, capitalize, Identifier, List, toPathTemplate } from '@skmtc/core'
import { toTsValue } from '@skmtc/typescript'
import { TanstackQueryBase } from './base.ts'
import { ResponseBodyZod } from './ResponseBodyZod.ts'

export class PaginatedQueryFn extends TanstackQueryBase {
  parameter: FunctionParameter
  responseModelZodName: string
  queryParamArgs: ListObject<string>

  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.queryParamArgs = List.toObject(operation.toParams(['query']).map(({ name }) => name))

    this.responseModelZodName = this.insertOperation(ResponseBodyZod, operation).toName()

    const typeDefinition = this.createAndRegisterDefinition({
      schema: operation.toParametersObject(),
      identifier: Identifier.createType(`${capitalize(settings.identifier.name)}Args`),
      schemaToValueFn: toTsValue,
      rootRef: 'none' as RefName
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
    
      const parsed = ${this.responseModelZodName}.parse(data)

      return parsed
    }`
  }
}
