import { FunctionParameter, List, toPathTemplate, type ListObject } from '@skmtc/lang-typescript'
import type { OasOperationProjectionConstructorArgs } from '@skmtc/core'
import { capitalize, decapitalize, OasVoid } from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import { TanstackQueryBase } from './base.ts'
import { ZodProjection } from '@skmtc/gen-zod'

export class PaginatedQueryFn extends TanstackQueryBase {
  parameter: FunctionParameter
  zodResponseName: string
  queryParamArgs: ListObject<string>

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs) {
    super({ context, operation, settings })

    this.queryParamArgs = List.toObject(operation.toParams(['query']).map(({ name }) => name))

    const zodResponse = this.insertNormalizedModel(ZodProjection, {
      schema: operation.toSuccessResponse()?.resolve().toSchema() ?? OasVoid.empty(),
      fallbackName: `${decapitalize(settings.identifier.name)}Response`
    })

    this.zodResponseName = zodResponse.identifier.name

    const typeDefinition = this.insertNormalizedModel(TsProjection, {
      schema: operation.toParametersObject(),
      fallbackName: `${capitalize(settings.identifier.name)}Args`
    })

    this.parameter = new FunctionParameter({
      typeDefinition,
      destructure: true,
      required: true,
      skipEmpty: true
    })

    this.register({
      imports: { '@/lib/supabase': ['supabase'] }
    })
  }

  override toString(): string {
    const { path, method } = this.operation

    return `async () => {
      const { data, error } = await supabase.functions.invoke(\`${toPathTemplate(path)}\`, {
        method: '${method.toUpperCase()}',
      })

      if (error) {
        throw error
      }

      return ${this.zodResponseName}.parse(data)
    }`
  }
}
