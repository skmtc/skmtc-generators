import { ShadcnTableBase } from './base.ts'
import { TsProjection } from '@skmtc/gen-typescript'
import { List, capitalize, isEmpty } from '@skmtc/core'
import type { OasOperationProjectionConstructorArgs, ListObject } from '@skmtc/core'
import type { EnrichmentSchema } from './enrichments.ts'

export class PathParams extends ShadcnTableBase {
  pathParamsTsName: string
  destructuredPathParams: ListObject<string>
  isEmpty: boolean
  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const params = operation.toParametersObject(['path'])

    this.isEmpty = isEmpty(params.properties ?? {})

    const { name: tableName } = ShadcnTableBase.toIdentifier({
      operation,
      enrichments: settings.enrichments
    })

    this.pathParamsTsName = capitalize(`${tableName}PathParams`)

    if (!this.isEmpty) {
      const pathParams = this.insertNormalizedModel(TsProjection, {
        schema: params,
        fallbackName: this.pathParamsTsName
      })

      this.destructuredPathParams = List.fromKeys(
        pathParams.value.objectProperties?.properties
      ).toObjectPlain()
    } else {
      this.destructuredPathParams = List.toObject([])
    }
  }

  override toString(): string {
    return this.isEmpty ? '' : `${this.destructuredPathParams}:${this.pathParamsTsName}`
  }
}
