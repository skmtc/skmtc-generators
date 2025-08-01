import { ShadcnSelectApiBase } from './base.ts'
import { toZodValue } from '@skmtc/gen-zod'
import { Identifier, List, capitalize } from '@skmtc/core'
import type { OperationInsertableArgs, ListObject, RefName } from '@skmtc/core'
import type { EnrichmentSchema } from './enrichments.ts'

export class PathParams extends ShadcnSelectApiBase {
  pathParamsTsName: string
  isEmpty: boolean
  destructuredPathParams: ListObject<string>
  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const params = operation.toParametersObject(['path'])

    this.isEmpty = Object.keys(params?.properties ?? {}).length === 0

    const { name: tableName } = ShadcnSelectApiBase.toIdentifier(operation)

    this.pathParamsTsName = capitalize(`${tableName}PathParams`)

    const pathParams = this.createAndRegisterDefinition({
      schema: params,
      identifier: Identifier.createVariable(this.pathParamsTsName),
      schemaToValueFn: toZodValue,
      rootRef: 'none' as RefName
    })

    this.destructuredPathParams = List.fromKeys(
      pathParams.value.objectProperties?.properties
    ).toObjectPlain()
  }

  override toString(): string {
    return this.isEmpty ? '' : `${this.destructuredPathParams}:${this.pathParamsTsName}`
  }
}
