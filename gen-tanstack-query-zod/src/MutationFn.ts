// @deno-types="npm:@types/babel__helper-validator-identifier@7.15.2"
import { isIdentifierName } from 'npm:@babel/helper-validator-identifier@7.22.20'
import {
  capitalize,
  handleKey,
  List,
  FunctionParameter,
  toPathTemplate,
  camelCase,
  OasVoid,
  decapitalize
} from '@skmtc/core'
import type { OperationInsertableArgs, ListObject, Stringable } from '@skmtc/core'
import { TsInsertable } from '@skmtc/gen-typescript'
import { TanstackQueryBase } from './base.ts'
import { ZodInsertable } from '@skmtc/gen-zod'

export class MutationFn extends TanstackQueryBase {
  parameter: FunctionParameter
  zodResponseName: string
  tsResponseName: string
  queryParamArgs: ListObject<string>
  headerParams: ListObject<Stringable>
  tsArgsName: string

  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.queryParamArgs = List.toObject(operation.toParams(['query']).map(({ name }) => name))

    const headerParams = operation.toParametersObject(['header'])

    this.headerParams = List.fromKeys(headerParams.properties ?? {}).toObject(key => {
      return isIdentifierName(key) ? key : List.toKeyValue(handleKey(key), camelCase(key))
    })

    const parametersObject = operation.toParametersObject()

    const parametersWithBody = operation.toRequestBody(({ schema }) => {
      return parametersObject.addProperty({ name: 'body', schema, required: true })
    })

    const typeDefinition = this.insertNormalizedModel(TsInsertable, {
      schema: parametersWithBody ?? parametersObject,
      fallbackName: `${capitalize(settings.identifier.name)}Args`
    })

    this.tsArgsName = typeDefinition.identifier.name

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

    const tsResponse = this.insertNormalizedModel(TsInsertable, {
      schema: operation.toSuccessResponse()?.resolve().toSchema() ?? OasVoid.empty(),
      fallbackName: `${capitalize(settings.identifier.name)}Response`
    })

    this.tsResponseName = tsResponse.identifier.name
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
    
      return ${this.zodResponseName}.parse(data)
    }`
  }
}
