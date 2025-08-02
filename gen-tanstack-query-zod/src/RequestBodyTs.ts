import type { OasOperation, OperationInsertableArgs, TypeSystemValue } from '@skmtc/core'
import { TanstackQueryBase } from './base.ts'
import { Identifier, capitalize, toEndpointName } from '@skmtc/core'
import { toTsValue, TsVoid } from '@skmtc/gen-typescript'
import { join } from '@std/path'

export class RequestBodyTs extends TanstackQueryBase {
  value: TypeSystemValue
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    const value = operation.toRequestBody(({ schema }) => {
      return toTsValue({
        context,
        schema,
        destinationPath: settings.exportPath,
        required: true,
        rootRef: schema.isRef() ? schema.toRefName() : undefined
      })
    })

    this.value = value ?? new TsVoid({ context, generatorKey: this.generatorKey })
  }

  static override toIdentifier(operation: OasOperation): Identifier {
    const name = capitalize(`${toEndpointName(operation)}Body`)

    return Identifier.createType(name)
  }

  static override toExportPath(): string {
    return join('@', 'services', `apiTypes.generated.ts`)
  }

  override toString(): string {
    return this.value.toString()
  }
}
