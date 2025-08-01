// @deno-types="npm:@types/babel__helper-validator-identifier@7.15.2"
import { isIdentifierName } from 'npm:@babel/helper-validator-identifier@7.22.20'
import {
  capitalize,
  handleKey,
  List,
  Identifier,
  FunctionParameter,
  toPathTemplate
} from '@skmtc/core'
import type { OperationInsertableArgs, ListObject, Stringable, RefName } from '@skmtc/core'
import { toTsValue } from '@skmtc/typescript'
import { TanstackQueryBase } from './base.ts'
import { ResponseBodyZod } from './ResponseBodyZod.ts'
import { camelCase } from 'lodash-es'

export class MutationFn extends TanstackQueryBase {
  parameter: FunctionParameter
  responseModelZodName: string
  queryParamArgs: ListObject<string>
  headerParams: ListObject<Stringable>

  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.queryParamArgs = List.toObject(operation.toParams(['query']).map(({ name }) => name))

    const headerParams = operation.toParametersObject(['header'])

    this.headerParams = List.fromKeys(headerParams.properties ?? {}).toObject((key) => {
      return isIdentifierName(key) ? key : List.toKeyValue(handleKey(key), camelCase(key))
    })

    const parametersObject = operation.toParametersObject()

    const parametersWithBody = operation.toRequestBody(({ schema }) => {
      return parametersObject.addProperty({ name: 'body', schema, required: true })
    })

    const typeDefinition = this.createAndRegisterDefinition({
      schema: parametersWithBody ?? parametersObject,
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

    this.responseModelZodName = this.insertOperation(ResponseBodyZod, operation).toName()
  }

  override toString(): string {
    return `async (${this.parameter}) => {      
      const res = await fetch(\`${toPathTemplate(this.operation.path)}\`, {
        method: '${this.operation.method.toUpperCase()}',
        ${this.parameter.hasProperty('body') ? 'body: JSON.stringify(body),' : ''}
      })

      const data = await res.json()

      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }
    
      return ${this.responseModelZodName}.parse(data)
    }`
  }
}
