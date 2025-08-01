import type { OasOperation, OperationInsertableArgs, TypeSystemValue, RefName } from '@skmtc/core'
import { TanstackQueryBase } from './base.ts'
import { Identifier, OasVoid, toEndpointName, decapitalize } from '@skmtc/core'
import { toZodValue } from '@skmtc/gen-zod'
import { join } from '@std/path'

export class ResponseBodyZod extends TanstackQueryBase {
  value: TypeSystemValue
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    const schema = operation.toSuccessResponse()?.resolve().toSchema()

    this.value = toZodValue({
      context,
      schema: schema ?? OasVoid.empty(),
      destinationPath: settings.exportPath,
      required: true,
      rootRef: schema?.isRef() ? schema.toRefName() : ('none' as RefName)
    })
  }

  static override toIdentifier(operation: OasOperation): Identifier {
    const name = decapitalize(`${toEndpointName(operation)}Response`)

    return Identifier.createVariable(name)
  }

  static override toExportPath(): string {
    return join('@', 'services', `apiTypes.generated.ts`)
  }

  override toString(): string {
    return this.value.toString()
  }
}
