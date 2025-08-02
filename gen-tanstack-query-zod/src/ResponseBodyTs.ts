import type { OasOperation, OperationInsertableArgs, TypeSystemValue } from '@skmtc/core'
import { TanstackQueryBase } from './base.ts'
import { Identifier, OasVoid, toEndpointName, capitalize } from '@skmtc/core'
import { toTsValue } from '@skmtc/gen-typescript'
import { join } from '@std/path'

export class ResponseBodyTs extends TanstackQueryBase {
  value: TypeSystemValue
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    const schema = operation.toSuccessResponse()?.resolve().toSchema()

    this.value = toTsValue({
      context,
      schema: schema ?? OasVoid.empty(),
      destinationPath: settings.exportPath,
      required: true,
      rootRef: schema?.isRef() ? schema.toRefName() : undefined
    })
  }

  static override toIdentifier(operation: OasOperation): Identifier {
    const name = capitalize(`${toEndpointName(operation)}Response`)

    return Identifier.createType(name)
  }

  static override toExportPath(): string {
    return join('@', 'services', `apiTypes.generated.ts`)
  }

  override toString(): string {
    return this.value.toString()
  }
}
