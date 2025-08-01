import type { OasOperation, OperationInsertableArgs, TypeSystemValue, RefName } from '@skmtc/core'
import { TanstackQueryBase } from './base.ts'
import { Identifier, decapitalize, toEndpointName } from '@skmtc/core'
import { toZodValue, ZodVoid } from '@skmtc/zod'
import { join } from '@std/path'

export class RequestBodyZod extends TanstackQueryBase {
  value: TypeSystemValue
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    const value = operation.toRequestBody(({ schema }) => {
      return toZodValue({
        context,
        schema,
        destinationPath: settings.exportPath,
        required: true,
        rootRef: schema?.isRef() ? schema.toRefName() : ('none' as RefName)
      })
    })

    this.value = value ?? new ZodVoid({ context, generatorKey: this.generatorKey })
  }

  static override toIdentifier(operation: OasOperation): Identifier {
    const name = `${decapitalize(toEndpointName(operation))}Body`

    return Identifier.createVariable(name)
  }

  static override toExportPath(): string {
    return join('@', 'services', `apiTypes.generated.ts`)
  }

  override toString(): string {
    return this.value.toString()
  }
}
